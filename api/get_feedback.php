<?php
require 'config.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$role = $_SESSION['user_role'];
$userId = $_SESSION['user_id'];

if ($role === 'admin') {
    $stmt = $pdo->query("
        SELECT f.*, u.name as studentName 
        FROM feedback f 
        JOIN users u ON f.user_id = u.id 
        ORDER BY f.created_at DESC
    ");
    $feedbacks = $stmt->fetchAll();
} else {
    $stmt = $pdo->prepare("
        SELECT f.*, u.name as studentName 
        FROM feedback f 
        JOIN users u ON f.user_id = u.id 
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
    ");
    $stmt->execute([$userId]);
    $feedbacks = $stmt->fetchAll();
}

// Add formatted date
foreach ($feedbacks as &$fb) {
    $fb['date'] = date('M d, Y', strtotime($fb['created_at']));
    $fb['studentId'] = $fb['user_id']; // for frontend filtering
}
echo json_encode($feedbacks);
?>