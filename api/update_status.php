<?php
require 'config.php';

if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Admin access required']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$id = (int)($data['id'] ?? 0);
$status = $data['status'] ?? '';
$allowed = ['pending', 'reviewed', 'resolved'];

if (!$id || !in_array($status, $allowed)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid data']);
    exit;
}

$stmt = $pdo->prepare("UPDATE feedback SET status = ? WHERE id = ?");
$stmt->execute([$status, $id]);

echo json_encode(['success' => true]);
?>