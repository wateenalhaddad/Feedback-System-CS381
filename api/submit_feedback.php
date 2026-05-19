<?php
require 'config.php';

if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'student') {
    http_response_code(403);
    echo json_encode(['error' => 'Only students can submit feedback']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$title    = trim($data['title'] ?? '');
$content  = trim($data['content'] ?? '');
$category = trim($data['category'] ?? 'general');

if (!$title || !$content) {
    http_response_code(400);
    echo json_encode(['error' => 'Title and content are required']);
    exit;
}

$stmt = $pdo->prepare("INSERT INTO feedback (user_id, target, message, category) VALUES (?, ?, ?, ?)");
$stmt->execute([$_SESSION['user_id'], $title, $content, $category]);
$stmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
$stmt->execute([$_SESSION['user_id']]);
if (!$stmt->fetch()) {
    http_response_code(401);
    echo json_encode(['error' => 'User no longer exists. Please login again.']);
    exit;
}
echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
?>