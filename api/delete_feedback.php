<?php
require 'config.php';

if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Admin access required']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$id = (int)($data['id'] ?? 0);

if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid ID']);
    exit;
}

$stmt = $pdo->prepare("DELETE FROM feedback WHERE id = ?");
$stmt->execute([$id]);

echo json_encode(['success' => true]);
?>