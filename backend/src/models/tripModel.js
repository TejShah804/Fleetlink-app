const { pool } = require('../config/db');
const {
  canTransition,
  generateOtpPair,
  confirmDeadline,
  NO_UPDATE_ALERT_HOURS
} = require('../utils/tripLifecycle');

/**
 * ── Column sets ─────────────────────────────────────────────────────────────
 *
 * There are three deliberately different SELECT lists, and the split is the
 * privacy boundary for this feature:
 *
 *   PUBLIC_FIELDS    browse lists. No address, no contact, no receiver, no OTP.
 *                    Deliberately omits pickup_contact_phone and receiver_phone
 *                    so a scraper walking /api/trips cannot harvest numbers.
 *
 *   DETAIL_FIELDS    operator's own trip + the assigned driver after 'confirmed'.
 *                    Addresses, contacts and receiver, but NOT the OTPs — the
 *                    driver must never receive them, and the operator reads
 *                    them from /api/applications/:id/otp.
 *
 *   OPERATOR_FIELDS  the full row including both OTPs. Only ever selected on a
 *                    query already scoped to fleet_operator_id = ?.
 */
const PUBLIC_FIELDS = `
  t.id,
  t.load_reference,
  t.fleet_operator_id,
  t.source,
  t.destination,
  t.vehicle_type,
  t.cargo_type,
  t.weight_tonnes,
  t.price,
  DATE_FORMAT(t.pickup_date, '%Y-%m-%d')  AS pickup_date,
  DATE_FORMAT(t.pickup_time, '%H:%i')      AS pickup_time,
  DATE_FORMAT(t.delivery_date, '%Y-%m-%d') AS delivery_date,
  t.payment_method,
  t.notes,
  t.status,
  t.created_at
`;

const DETAIL_FIELDS = `
  t.id,
  t.load_reference,
  t.fleet_operator_id,
  t.source,
  t.destination,
  t.vehicle_type,
  t.cargo_type,
  t.weight_tonnes,
  t.price,
  DATE_FORMAT(t.pickup_date, '%Y-%m-%d')  AS pickup_date,
  DATE_FORMAT(t.pickup_time, '%H:%i')      AS pickup_time,
  DATE_FORMAT(t.delivery_date, '%Y-%m-%d') AS delivery_date,
  t.payment_method,
  t.payment_status,
  t.notes,
  t.status,
  t.pickup_address,
  t.pickup_contact_name,
  t.pickup_contact_phone,
  t.delivery_address,
  t.receiver_name,
  t.receiver_phone,
  t.assigned_driver_id,
  DATE_FORMAT(t.confirm_by, '%Y-%m-%d %H:%i:%s')    AS confirm_by,
  DATE_FORMAT(t.delivered_at, '%Y-%m-%d %H:%i:%s')   AS delivered_at,
  t.delivery_proof_url,
  t.otp_attempts,
  t.created_at
`;

const OPERATOR_FIELDS = `
  ${DETAIL_FIELDS},
  t.pickup_otp,
  t.delivery_otp
`;

class TripModel {
  // ── References ────────────────────────────────────────────────────────────

  /** A candidate reference, e.g. FL-TRP-3920 */
  static buildReference() {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `FL-TRP-${num}`;
  }

  /**
   * A reference that is not already taken. Four digits only offers 9000
   * combinations, so the database is consulted rather than trusting the RNG.
   */
  static async generateUniqueReference() {
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const reference = this.buildReference();
      const existing = await this.findByReference(reference);
      if (!existing) return reference;
    }
    return `FL-TRP-${String(Date.now()).slice(-6)}`;
  }

  static async findByReference(load_reference) {
    const [rows] = await pool.execute(
      `SELECT id, load_reference FROM trips WHERE load_reference = ?`,
      [load_reference]
    );
    return rows[0] || null;
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  /**
   * Bare lookup used for ownership and status checks. Deliberately returns
   * only the columns a guard needs — never hand this to a response builder.
   */
  static async findGuardColumns(id) {
    const [rows] = await pool.execute(
      `SELECT id, fleet_operator_id, assigned_driver_id, status, confirm_by
       FROM trips WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Full trip including the OTPs, with operator and driver contact details.
   * Scoped to one operator. Used by the operator's trip detail page.
   */
  static async findByIdForOperator(id, fleet_operator_id) {
    const [rows] = await pool.execute(
      `SELECT
        ${OPERATOR_FIELDS},
        u.name AS operator_name,
        u.company_name AS operator_company,
        u.phone_number AS operator_phone,
        u.email AS operator_email,
        d.name AS driver_name,
        d.email AS driver_email,
        d.phone_number AS driver_phone
      FROM trips t
      JOIN users u ON t.fleet_operator_id = u.id
      LEFT JOIN users d ON t.assigned_driver_id = d.id
      WHERE t.id = ? AND t.fleet_operator_id = ?`,
      [id, fleet_operator_id]
    );
    return rows[0] || null;
  }

  /**
   * Trip for the assigned driver. Excludes both OTPs — the driver proves
   * possession by entering the code, not by reading it.
   */
  static async findByIdForDriver(id, driver_id) {
    const [rows] = await pool.execute(
      `SELECT
        ${DETAIL_FIELDS},
        u.name AS operator_name,
        u.company_name AS operator_company,
        u.phone_number AS operator_phone,
        u.email AS operator_email
      FROM trips t
      JOIN users u ON t.fleet_operator_id = u.id
      WHERE t.id = ? AND t.assigned_driver_id = ?`,
      [id, driver_id]
    );
    return rows[0] || null;
  }

  /** Minimal public shape, for a driver's own application cards. */
  static async findByIdPublic(id) {
    const [rows] = await pool.execute(
      `SELECT
        ${PUBLIC_FIELDS},
        u.name AS operator_name,
        u.company_name AS operator_company,
        u.phone_number AS operator_phone
      FROM trips t
      JOIN users u ON t.fleet_operator_id = u.id
      WHERE t.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Open trips for the browse list.
   * Filters: source, destination, vehicle_type, payment_method, pickup_date
   * (the last matches trips picked up on or after the given date).
   *
   * Only PUBLIC_FIELDS is selected — this endpoint is unauthenticated, so
   * nothing private can leak through it.
   */
  static async getOpenTrips({ source, destination, vehicle_type, payment_method, pickup_date } = {}) {
    let query = `
      SELECT
        ${PUBLIC_FIELDS},
        u.name AS operator_name,
        u.company_name AS operator_company,
        u.phone_number AS operator_phone
      FROM trips t
      JOIN users u ON t.fleet_operator_id = u.id
      WHERE t.status = 'open'
    `;

    const params = [];

    if (source) {
      query += ` AND t.source LIKE ?`;
      params.push(`%${source}%`);
    }
    if (destination) {
      query += ` AND t.destination LIKE ?`;
      params.push(`%${destination}%`);
    }
    if (vehicle_type) {
      query += ` AND LOWER(t.vehicle_type) = LOWER(?)`;
      params.push(vehicle_type);
    }
    if (payment_method) {
      query += ` AND t.payment_method = ?`;
      params.push(payment_method);
    }
    if (pickup_date) {
      query += ` AND t.pickup_date >= ?`;
      params.push(pickup_date);
    }

    query += ` ORDER BY t.pickup_date ASC, t.created_at DESC`;

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  /**
   * One operator's trips, with applicant count, assigned driver name, and a
   * computed no_update_alert.
   *
   * no_update_alert is true only for in_transit trips whose newest trip_update
   * is at least NO_UPDATE_ALERT_HOURS old. The check is done in SQL via
   * MAX(created_at) so the operator list needs no N+1 follow-up queries.
   */
  static async getTripsByOperator(fleet_operator_id) {
    const query = `
      SELECT
        ${OPERATOR_FIELDS},
        d.name AS driver_name,
        (
          SELECT COUNT(*) FROM applications a WHERE a.trip_id = t.id
        ) AS applicant_count,
        (
          SELECT MAX(tu.created_at) FROM trip_updates tu WHERE tu.trip_id = t.id
        ) AS last_update_at
      FROM trips t
      LEFT JOIN users d ON t.assigned_driver_id = d.id
      WHERE t.fleet_operator_id = ?
      ORDER BY t.pickup_date ASC, t.created_at DESC
    `;

    const [rows] = await pool.execute(query, [fleet_operator_id]);
    const thresholdHours = NO_UPDATE_ALERT_HOURS;

    return rows.map((row) => {
      const lastUpdate = row.last_update_at ? new Date(row.last_update_at) : null;
      const hoursSinceUpdate = lastUpdate && !Number.isNaN(lastUpdate.getTime())
        ? (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60)
        : null;

      return {
        ...row,
        applicant_count: Number(row.applicant_count) || 0,
        hours_since_update: hoursSinceUpdate === null
          ? null
          : Math.floor(hoursSinceUpdate * 10) / 10,
        // An in-transit trip with no update at all also needs attention
        no_update_alert: row.status === 'in_transit'
          && (hoursSinceUpdate === null || hoursSinceUpdate >= thresholdHours)
      };
    });
  }

  /**
   * The driver's own active trips, for the Active Trip page — one row per trip
   * the driver is currently responsible for, across the actionable statuses.
   *
   * Privacy note: a trip that is still 'assigned' has not been confirmed yet,
   * so the driver gets the city, schedule and payment summary but not the
   * addresses or contact numbers. The six sensitive columns are CASE-gated to
   * NULL in that status and returned normally from 'confirmed' onwards, which
   * keeps both shapes in a single round trip and means a status change can
   * never be served with the wrong field set.
   *
   * The column list is written out by hand rather than interpolated from
   * PUBLIC_FIELDS/DETAIL_FIELDS because the gating is per-column, so the
   * aliases below have no equivalent in those lists. Keep it in step with what
   * frontend/src/components/ActiveTrip.jsx reads off a trip.
   */
  static async getActiveTripsForDriver(driver_id) {
    const query = `
      SELECT
        t.id,
        t.load_reference,
        t.source,
        t.destination,
        t.vehicle_type,
        t.cargo_type,
        t.weight_tonnes,
        t.price,
        t.payment_method,
        t.pickup_date,
        t.pickup_time,
        t.delivery_date,
        t.notes,
        t.status,
        t.fleet_operator_id,
        t.assigned_driver_id,
        t.confirm_by,
        t.otp_attempts,
        t.created_at,

        -- Unlocked only once the driver has confirmed the assignment
        CASE WHEN t.status = 'assigned' THEN NULL ELSE t.pickup_address END AS pickup_address,
        CASE WHEN t.status = 'assigned' THEN NULL ELSE t.pickup_contact_name END AS pickup_contact_name,
        CASE WHEN t.status = 'assigned' THEN NULL ELSE t.pickup_contact_phone END AS pickup_contact_phone,
        CASE WHEN t.status = 'assigned' THEN NULL ELSE t.delivery_address END AS delivery_address,
        CASE WHEN t.status = 'assigned' THEN NULL ELSE t.receiver_name END AS receiver_name,
        CASE WHEN t.status = 'assigned' THEN NULL ELSE t.receiver_phone END AS receiver_phone,

        -- pickup_otp / delivery_otp are deliberately not selected, in any status
        u.name AS operator_name,
        u.company_name AS operator_company,
        u.phone_number AS operator_phone
      FROM trips t
      JOIN users u ON t.fleet_operator_id = u.id
      WHERE t.assigned_driver_id = ?
        AND t.status IN ('assigned','confirmed','in_transit','delivered')
      ORDER BY t.pickup_date ASC, t.created_at DESC
    `;

    const [rows] = await pool.execute(query, [driver_id]);
    return rows;
  }

  // ── Writes ────────────────────────────────────────────────────────────────

  static async createTrip({
    fleet_operator_id,
    load_reference,
    source,
    destination,
    vehicle_type,
    cargo_type = 'General Goods',
    weight_tonnes = null,
    price,
    pickup_date,
    pickup_time,
    delivery_date,
    payment_method,
    notes = null,
    pickup_address,
    pickup_contact_name,
    pickup_contact_phone,
    delivery_address = null,
    receiver_name,
    receiver_phone
  }) {
    const finalRef = load_reference ? load_reference.trim() : await this.generateUniqueReference();

    const [result] = await pool.execute(
      `INSERT INTO trips (
         fleet_operator_id, load_reference, source, destination, vehicle_type,
         cargo_type, weight_tonnes, price, pickup_date, pickup_time,
         delivery_date, payment_method, notes,
         pickup_address, pickup_contact_name, pickup_contact_phone,
         delivery_address, receiver_name, receiver_phone, status
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
      [
        fleet_operator_id,
        finalRef,
        source,
        destination,
        vehicle_type,
        cargo_type,
        weight_tonnes,
        price,
        pickup_date,
        pickup_time,
        delivery_date,
        payment_method,
        notes,
        pickup_address,
        pickup_contact_name,
        pickup_contact_phone,
        delivery_address,
        receiver_name,
        receiver_phone
      ]
    );

    return this.findByIdForOperator(result.insertId, fleet_operator_id);
  }

  static async updateTrip(id, {
    load_reference,
    source,
    destination,
    vehicle_type,
    cargo_type = 'General Goods',
    weight_tonnes = null,
    price,
    pickup_date,
    pickup_time,
    delivery_date,
    payment_method,
    notes = null,
    pickup_address,
    pickup_contact_name,
    pickup_contact_phone,
    delivery_address = null,
    receiver_name,
    receiver_phone
  }) {
    await pool.execute(
      `UPDATE trips
       SET load_reference       = COALESCE(?, load_reference),
           source               = ?,
           destination          = ?,
           vehicle_type         = ?,
           cargo_type           = ?,
           weight_tonnes        = ?,
           price                = ?,
           pickup_date          = ?,
           pickup_time          = ?,
           delivery_date        = ?,
           payment_method       = ?,
           notes                = ?,
           pickup_address       = ?,
           pickup_contact_name  = ?,
           pickup_contact_phone = ?,
           delivery_address     = ?,
           receiver_name        = ?,
           receiver_phone       = ?
       WHERE id = ?`,
      [
        load_reference || null,
        source,
        destination,
        vehicle_type,
        cargo_type,
        weight_tonnes,
        price,
        pickup_date,
        pickup_time,
        delivery_date,
        payment_method,
        notes,
        pickup_address,
        pickup_contact_name,
        pickup_contact_phone,
        delivery_address,
        receiver_name,
        receiver_phone,
        id
      ]
    );

    return id;
  }

  /**
   * Approve an applicant. In one transaction:
   *   1. status → 'assigned', assigned_driver_id set
   *   2. two fresh 4-digit OTPs, confirm_by = now + 2 hours
   *   3. otp_attempts reset to 0 for the new assignment
   *   4. other applications → rejected
   *   5. the trip's previous updates cleared, since this is a fresh driver
   *
   * Rows are locked FOR UPDATE so a double-click on Approve cannot run two
   * interleaved transactions and leave the trip pointing at two drivers.
   */
  static async assignTrip({ trip_id, application_id, driver_id }) {
    const connection = await pool.getConnection();
    const { pickup_otp, delivery_otp } = generateOtpPair();
    const deadline = confirmDeadline();

    try {
      await connection.beginTransaction();

      const [tripRows] = await connection.execute(
        `SELECT id, status FROM trips WHERE id = ? FOR UPDATE`,
        [trip_id]
      );
      if (!tripRows.length) {
        await connection.rollback();
        return { ok: false, reason: 'not_found' };
      }
      if (!canTransition(tripRows[0].status, 'assigned')) {
        await connection.rollback();
        return { ok: false, reason: 'invalid_transition', from: tripRows[0].status };
      }

      await connection.execute(
        `UPDATE trips
         SET status              = 'assigned',
             assigned_driver_id  = ?,
             pickup_otp          = ?,
             delivery_otp        = ?,
             confirm_by          = ?,
             otp_attempts        = 0,
             delivered_at        = NULL,
             delivery_proof_url  = NULL
         WHERE id = ?`,
        [driver_id, pickup_otp, delivery_otp, deadline, trip_id]
      );

      await connection.execute(
        `UPDATE applications
         SET status = 'accepted', rejection_reason = NULL
         WHERE id = ?`,
        [application_id]
      );

      await connection.execute(
        `UPDATE applications
         SET status = 'rejected',
             rejection_reason = 'Trip was assigned to another driver'
         WHERE trip_id = ? AND id != ? AND status = 'pending'`,
        [trip_id, application_id]
      );

      // A new driver starts a new timeline
      await connection.execute(
        `DELETE FROM trip_updates WHERE trip_id = ?`,
        [trip_id]
      );

      await connection.commit();
      return { ok: true, pickup_otp, delivery_otp, confirm_by: deadline };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Undo an assignment: back to 'open', driver and OTPs cleared. Used by
   * reassign when the driver missed the confirm deadline.
   */
  static async reopenTrip(trip_id) {
    await pool.execute(
      `UPDATE trips
       SET status             = 'open',
           assigned_driver_id = NULL,
           pickup_otp         = NULL,
           delivery_otp       = NULL,
           confirm_by         = NULL,
           otp_attempts       = 0
       WHERE id = ?`,
      [trip_id]
    );
  }

  /**
   * The driver accepted the assignment in time. OTPs are kept — the driver
   * still needs them to collect and deliver the load.
   */
  static async confirmTrip(trip_id) {
    await pool.execute(
      `UPDATE trips SET status = 'confirmed', confirm_by = NULL WHERE id = ?`,
      [trip_id]
    );
  }

  /**
   * Confirm the assignment, but only from 'assigned'. The status guard lives
   * in SQL so a concurrent reassign cannot slip in between the check and here.
   */
  static async confirmAssignment(trip_id) {
    const [result] = await pool.execute(
      `UPDATE trips SET status = 'confirmed', confirm_by = NULL
       WHERE id = ? AND status = 'assigned'`,
      [trip_id]
    );
    return result.affectedRows > 0;
  }

  /** Driver cleared the pickup OTP: the load is now physically moving. */
  static async markInTransit(trip_id) {
    const [result] = await pool.execute(
      `UPDATE trips SET status = 'in_transit' WHERE id = ? AND status = 'confirmed'`,
      [trip_id]
    );
    return result.affectedRows > 0;
  }

  /** Driver cleared the delivery OTP: proof recorded, awaiting operator sign-off. */
  static async markDelivered(trip_id, delivery_proof_url) {
    const [result] = await pool.execute(
      `UPDATE trips
       SET status = 'delivered',
           delivered_at = NOW(),
           delivery_proof_url = ?
       WHERE id = ? AND status = 'in_transit'`,
      [delivery_proof_url, trip_id]
    );
    return result.affectedRows > 0;
  }

  /** Operator sign-off. */
  static async markCompleted(trip_id) {
    const [result] = await pool.execute(
      `UPDATE trips SET status = 'completed' WHERE id = ? AND status = 'delivered'`,
      [trip_id]
    );
    return result.affectedRows > 0;
  }

  static async markPaymentPaid(trip_id) {
    const [result] = await pool.execute(
      `UPDATE trips SET payment_status = 'paid' WHERE id = ? AND status = 'completed'`,
      [trip_id]
    );
    return result.affectedRows > 0;
  }

  /** Wrong OTP: count the attempt, reset the counter if still under the cap. */
  static async recordOtpFailure(trip_id) {
    await pool.execute(
      `UPDATE trips SET otp_attempts = otp_attempts + 1 WHERE id = ?`,
      [trip_id]
    );
    const [rows] = await pool.execute(
      `SELECT otp_attempts FROM trips WHERE id = ?`,
      [trip_id]
    );
    return rows[0] ? rows[0].otp_attempts : 0;
  }

  static async cancelTrip(trip_id) {
    await pool.execute(
      `UPDATE trips SET status = 'cancelled' WHERE id = ?`,
      [trip_id]
    );
  }

  // ── Timeline ──────────────────────────────────────────────────────────────

  static async addUpdate({ trip_id, driver_id, type, message = null }) {
    const [result] = await pool.execute(
      `INSERT INTO trip_updates (trip_id, driver_id, type, message)
       VALUES (?, ?, ?, ?)`,
      [trip_id, driver_id, type, message]
    );
    return this.findUpdateById(result.insertId);
  }

  static async findUpdateById(id) {
    const [rows] = await pool.execute(
      `SELECT
         tu.id,
         tu.trip_id,
         tu.driver_id,
         tu.type,
         tu.message,
         DATE_FORMAT(tu.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
       FROM trip_updates tu
       WHERE tu.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  /** Newest first, joined with the driver's display name. */
  static async getTimeline(trip_id) {
    const [rows] = await pool.execute(
      `SELECT
         tu.id,
         tu.trip_id,
         tu.driver_id,
         tu.type,
         tu.message,
         DATE_FORMAT(tu.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
         u.name AS driver_name
       FROM trip_updates tu
       JOIN users u ON tu.driver_id = u.id
       WHERE tu.trip_id = ?
       ORDER BY tu.created_at DESC, tu.id DESC`,
      [trip_id]
    );
    return rows;
  }

  static async deleteTrip(id) {
    const [result] = await pool.execute(`DELETE FROM trips WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = TripModel;
module.exports.PUBLIC_FIELDS = PUBLIC_FIELDS;
module.exports.DETAIL_FIELDS = DETAIL_FIELDS;
module.exports.OPERATOR_FIELDS = OPERATOR_FIELDS;
