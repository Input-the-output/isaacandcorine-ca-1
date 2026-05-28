<?php
header("Content-Type: application/json; charset=UTF-8");

ini_set("display_errors", 0);
ini_set("display_startup_errors", 0);
error_reporting(E_ALL);

mysqli_report(MYSQLI_REPORT_OFF);

/* =========================
   DATABASE CONNECTION
========================= */
$host = "sql312.infinityfree.com";
$user = "if0_42030387";
$password = "__DB_PASSWORD__";
$database = "__DB_NAME__";

/* =========================
   JSON RESPONSE HELPER
========================= */
function send_json($success, $status, $message, $extra = []) {
    echo json_encode(array_merge([
        "success" => $success,
        "status" => $status,
        "message" => $message
    ], $extra));
    exit;
}

/* =========================
   REQUEST CHECK
========================= */
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    send_json(false, "method_not_allowed", "Method not allowed. Use POST.");
}

/* =========================
   CONNECT TO DATABASE
========================= */
$conn = new mysqli($host, $user, $password, $database);

if ($conn->connect_error) {
    send_json(false, "db_connection_failed", "Database connection failed: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4");

/* =========================
   COMMON INPUTS
========================= */
$action = trim($_POST["action"] ?? "find");
$full_name = trim($_POST["full_name"] ?? "");

if ($full_name === "") {
    send_json(false, "empty_name", "Please enter your full name.");
}

/* =========================
   FIND INVITATION
========================= */
if ($action === "find") {
    $sql = "
        SELECT 
            id,
            full_name,
            COALESCE(is_submitted, 0) AS is_submitted,
            pre_wedding_attendance,
            wedding_attendance,
            pre_wedding_guest_attendance,
            wedding_guest_attendance,
            guests_count
        FROM rsvps
        WHERE LOWER(TRIM(full_name)) = LOWER(TRIM(?))
        LIMIT 1
    ";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        send_json(false, "server_error", "Prepare failed in FIND: " . $conn->error);
    }

    $stmt->bind_param("s", $full_name);

    if (!$stmt->execute()) {
        send_json(false, "server_error", "Execute failed in FIND: " . $stmt->error);
    }

    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        send_json(
            false,
            "not_found",
            "We couldn’t find your name on the guest list. Please check the spelling or contact us directly."
        );
    }

    $guest = $result->fetch_assoc();

    $already_submitted =
        (int)$guest["is_submitted"] === 1 &&
        !empty($guest["pre_wedding_attendance"]) &&
        !empty($guest["wedding_attendance"]) &&
        !empty($guest["pre_wedding_guest_attendance"]) &&
        !empty($guest["wedding_guest_attendance"]);

    if ($already_submitted) {
        send_json(
            false,
            "already_submitted",
            "Your RSVP has already been recorded. If you need to make changes, please contact us directly.",
            [
                "guest_id" => (int)$guest["id"],
                "guest_name" => $guest["full_name"]
            ]
        );
    }

    send_json(
        true,
        "found",
        "Invitation found.",
        [
            "guest_id" => (int)$guest["id"],
            "guest_name" => $guest["full_name"]
        ]
    );
}

/* =========================
   SUBMIT RSVP
========================= */
if ($action === "submit") {
    $guest_id = intval($_POST["guest_id"] ?? 0);

    $pre_wedding = trim($_POST["pre_wedding_attendance"] ?? "");
    $wedding = trim($_POST["wedding_attendance"] ?? "");

    $pre_wedding_guest = trim($_POST["pre_wedding_guest_attendance"] ?? "");
    $wedding_guest = trim($_POST["wedding_guest_attendance"] ?? "");
    if ($guest_id <= 0) {
        send_json(false, "invalid_guest", "Invalid guest.");
    }

    if (!in_array($pre_wedding, ["attending", "declining"], true)) {
        send_json(false, "missing_pre_wedding", "Please select your Pre-Wedding attendance.");
    }

    if (!in_array($wedding, ["attending", "declining"], true)) {
        send_json(false, "missing_wedding", "Please select your Wedding attendance.");
    }

    if (!in_array($pre_wedding_guest, ["attending", "declining"], true)) {
        send_json(false, "missing_pre_wedding_guest", "Please select your Guest +1 Pre-Wedding attendance.");
    }

    if (!in_array($wedding_guest, ["attending", "declining"], true)) {
        send_json(false, "missing_wedding_guest", "Please select your Guest +1 Wedding attendance.");
    }
    if ($wedding_guest === "attending") {
        $wedding_guest_count += 1;
    }

    $check_sql = "
        SELECT 
            id,
            full_name,
            COALESCE(is_submitted, 0) AS is_submitted,
            pre_wedding_attendance,
            wedding_attendance,
            pre_wedding_guest_attendance,
            wedding_guest_attendance,
            guests_count
        FROM rsvps
        WHERE id = ?
          AND LOWER(TRIM(full_name)) = LOWER(TRIM(?))
        LIMIT 1
    ";

    $check_stmt = $conn->prepare($check_sql);

    if (!$check_stmt) {
        send_json(false, "server_error", "Prepare failed while checking guest: " . $conn->error);
    }

    $check_stmt->bind_param("is", $guest_id, $full_name);

    if (!$check_stmt->execute()) {
        send_json(false, "server_error", "Execute failed while checking guest: " . $check_stmt->error);
    }

    $check_result = $check_stmt->get_result();

    if ($check_result->num_rows === 0) {
        send_json(false, "guest_not_found", "Guest not found. Please search your name again.");
    }

    $guest = $check_result->fetch_assoc();

    $already_submitted =
        (int)$guest["is_submitted"] === 1 &&
        !empty($guest["pre_wedding_attendance"]) &&
        !empty($guest["wedding_attendance"]) &&
        !empty($guest["pre_wedding_guest_attendance"]) &&
        !empty($guest["wedding_guest_attendance"]);

    if ($already_submitted) {
        send_json(false, "already_submitted", "Your RSVP has already been recorded.");
    }

    $overall_attendance = $wedding === "attending" ? "yes" : "no";

    /*
        guests_count uses the existing database column.
        It starts from 0 and adds +1 for every "attending" choice:
        - Pre-Wedding main guest
        - Pre-Wedding Guest +1
        - Wedding main guest
        - Wedding Guest +1
    */
    $guests_count = 0;

    if ($pre_wedding === "attending") {
        $guests_count += 1;
    }

    if ($pre_wedding_guest === "attending") {
        $guests_count += 1;
    }

    if ($wedding === "attending") {
        $guests_count += 1;
    }

    if ($wedding_guest === "attending") {
        $guests_count += 1;
    }

    $update_sql = "
        UPDATE rsvps
        SET 
            pre_wedding_attendance = ?,
            wedding_attendance = ?,
            pre_wedding_guest_attendance = ?,
            wedding_guest_attendance = ?,
            attendance = ?,
            guests_count = ?,
            is_submitted = 1
        WHERE id = ?
    ";

    $update_stmt = $conn->prepare($update_sql);

    if (!$update_stmt) {
        send_json(false, "server_error", "Prepare failed in SUBMIT: " . $conn->error);
    }

    $update_stmt->bind_param(
        "sssssii",
        $pre_wedding,
        $wedding,
        $pre_wedding_guest,
        $wedding_guest,
        $overall_attendance,
        $guests_count,
        $guest_id
    );

    if (!$update_stmt->execute()) {
        send_json(false, "server_error", "Execute failed in SUBMIT: " . $update_stmt->error);
    }

    $verify_sql = "
        SELECT 
            is_submitted,
            pre_wedding_attendance,
            wedding_attendance,
            pre_wedding_guest_attendance,
            wedding_guest_attendance,
            guests_count
        FROM rsvps
        WHERE id = ?
        LIMIT 1
    ";

    $verify_stmt = $conn->prepare($verify_sql);

    if (!$verify_stmt) {
        send_json(false, "server_error", "Prepare failed while verifying RSVP: " . $conn->error);
    }

    $verify_stmt->bind_param("i", $guest_id);

    if (!$verify_stmt->execute()) {
        send_json(false, "server_error", "Execute failed while verifying RSVP: " . $verify_stmt->error);
    }

    $verify_result = $verify_stmt->get_result();
    $saved = $verify_result->fetch_assoc();

    if (
        $saved &&
        (int)$saved["is_submitted"] === 1 &&
        $saved["pre_wedding_attendance"] === $pre_wedding &&
        $saved["wedding_attendance"] === $wedding &&
        $saved["pre_wedding_guest_attendance"] === $pre_wedding_guest &&
        $saved["wedding_guest_attendance"] === $wedding_guest &&
        (int)$saved["guests_count"] === $guests_count
    ) {
        send_json(true, "submitted", "Thank you! Your RSVP was submitted successfully.");
    }

    send_json(false, "not_saved", "The RSVP could not be saved. Please try again.");
}

/* =========================
   INVALID ACTION
========================= */
send_json(false, "invalid_action", "Invalid action.");
?>
