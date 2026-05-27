<?php
header("Content-Type: application/json");

ini_set("display_errors", 0);
ini_set("display_startup_errors", 0);
error_reporting(E_ALL);

mysqli_report(MYSQLI_REPORT_OFF);

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method not allowed."
    ]);
    exit;
}

$host = "sql312.infinityfree.com";
$user = "if0_42030387";
$password = "81387985";
$database = "if0_42030387_wedding";

$conn = new mysqli($host, $user, $password, $database);

if ($conn->connect_error) {
    echo json_encode([
        "success" => false,
        "message" => "Database connection failed."
    ]);
    exit;
}

$conn->set_charset("utf8mb4");

$action = trim($_POST["action"] ?? "");

if ($action === "") {
    $action = "find";
}

$full_name = trim($_POST["full_name"] ?? "");

if ($full_name === "") {
    echo json_encode([
        "success" => false,
        "status" => "empty_name",
        "message" => "Please enter your full name."
    ]);
    exit;
}

/* =========================
   FIND INVITATION
========================= */
if ($action === "find") {
    $sql = "SELECT id, full_name, is_submitted, pre_wedding_attendance, wedding_attendance
            FROM rsvps
            WHERE LOWER(TRIM(full_name)) = LOWER(TRIM(?))
            LIMIT 1";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        echo json_encode([
            "success" => false,
            "status" => "server_error",
            "message" => "Prepare failed in FIND: " . $conn->error
        ]);
        exit;
    }

    if (!$stmt->bind_param("s", $full_name)) {
        echo json_encode([
            "success" => false,
            "status" => "server_error",
            "message" => "Bind failed in FIND: " . $stmt->error
        ]);
        exit;
    }

    if (!$stmt->execute()) {
        echo json_encode([
            "success" => false,
            "status" => "server_error",
            "message" => "Execute failed in FIND: " . $stmt->error
        ]);
        exit;
    }

    $stmt->store_result();

    if ($stmt->num_rows === 0) {
        echo json_encode([
            "success" => false,
            "status" => "not_found",
            "message" => "We couldn’t find your name on the guest list. Please check the spelling or contact us directly."
        ]);
        exit;
    }

    $stmt->bind_result($guest_id, $guest_name, $is_submitted, $pre_wedding_attendance, $wedding_attendance);
    $stmt->fetch();

    if (
        (int)$is_submitted === 1 &&
        !empty($pre_wedding_attendance) &&
        !empty($wedding_attendance)
    ) {
        echo json_encode([
            "success" => false,
            "status" => "already_submitted",
            "guest_id" => $guest_id,
            "guest_name" => $guest_name,
            "message" => "Your RSVP has already been recorded. If you need to make changes, please contact us directly."
        ]);
        exit;
    }

    echo json_encode([
        "success" => true,
        "status" => "found",
        "guest_id" => $guest_id,
        "guest_name" => $guest_name,
        "message" => "Invitation found."
    ]);
    exit;
}

/* =========================
   SUBMIT RSVP
========================= */
if ($action === "submit") {
    $guest_id = intval($_POST["guest_id"] ?? 0);
    $pre_wedding = trim($_POST["pre_wedding_attendance"] ?? "");
    $wedding = trim($_POST["wedding_attendance"] ?? "");

    if ($guest_id <= 0) {
        echo json_encode([
            "success" => false,
            "status" => "invalid_guest",
            "message" => "Invalid guest."
        ]);
        exit;
    }

    if (!in_array($pre_wedding, ["attending", "declining"], true)) {
        echo json_encode([
            "success" => false,
            "status" => "missing_pre_wedding",
            "message" => "Please select your Pre-Wedding attendance."
        ]);
        exit;
    }

    if (!in_array($wedding, ["attending", "declining"], true)) {
        echo json_encode([
            "success" => false,
            "status" => "missing_wedding",
            "message" => "Please select your Wedding attendance."
        ]);
        exit;
    }

    $overall_attendance = $wedding === "attending" ? "yes" : "no";

    $sql = "UPDATE rsvps
            SET pre_wedding_attendance = ?,
                wedding_attendance = ?,
                attendance = ?,
                is_submitted = 1
            WHERE id = ?
              AND (
                    is_submitted = 0
                    OR pre_wedding_attendance IS NULL
                    OR wedding_attendance IS NULL
                  )";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        echo json_encode([
            "success" => false,
            "status" => "server_error",
            "message" => "Prepare failed in SUBMIT: " . $conn->error
        ]);
        exit;
    }

    if (!$stmt->bind_param("sssi", $pre_wedding, $wedding, $overall_attendance, $guest_id)) {
        echo json_encode([
            "success" => false,
            "status" => "server_error",
            "message" => "Bind failed in SUBMIT: " . $stmt->error
        ]);
        exit;
    }

    if (!$stmt->execute()) {
        echo json_encode([
            "success" => false,
            "status" => "server_error",
            "message" => "Execute failed in SUBMIT: " . $stmt->error
        ]);
        exit;
    }

    if ($stmt->affected_rows > 0) {
        echo json_encode([
            "success" => true,
            "status" => "submitted",
            "message" => "Thank you! Your RSVP was submitted successfully."
        ]);
        exit;
    }

    echo json_encode([
        "success" => false,
        "status" => "already_submitted",
        "message" => "Your RSVP has already been recorded. If you need to make changes, please contact us directly."
    ]);
    exit;
}

echo json_encode([
    "success" => false,
    "status" => "invalid_action",
    "message" => "Invalid action: " . $action
]);

$conn->close();
?>
