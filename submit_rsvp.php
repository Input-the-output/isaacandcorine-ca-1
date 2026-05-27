<?php
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(403);
    exit("Access denied.");
}

$host = "localhost";
$user = "root";
$password = "";
$database = "my_app_db";

$conn = new mysqli($host, $user, $password, $database);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$full_name = $_POST['full_name'];
if (empty($full_name)) {
    die("Name was not sent from the form.");
}

$sql = "INSERT INTO rsvps (full_name, attendance)
        VALUES (?, 'yes')";

$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $full_name);

if ($stmt->execute()) {
    echo "RSVP submitted successfully!";
} else {
    echo "Error: " . $stmt->error;
}

$stmt->close();
$conn->close();
?>