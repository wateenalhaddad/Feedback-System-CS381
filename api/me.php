<?php
require 'config.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not logged in']);
    exit;
}

$stmt = $pdo->prepare("SELECT id, name, email, role FROM users WHERE id = ?");
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();

if (!$user) {
    // Session user_id is invalid – destroy session and force re-login
    session_destroy();
    http_response_code(401);
    echo json_encode(['error' => 'Invalid session. Please login again.']);
    exit;
}

echo json_encode($user);
?>