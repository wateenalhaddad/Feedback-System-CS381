<?php
require 'config.php';

$data = json_decode(file_get_contents('php://input'), true);
$email    = $data['email'] ?? '';
$password = $data['password'] ?? '';

$stmt = $pdo->prepare("SELECT id, name, email, role, password FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'User not found. Use student@university.edu or admin@university.edu']);
    exit;
}

// Legacy demo accounts have literal password 'any'
if ($user['password'] !== 'any' && !password_verify($password, $user['password'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid password']);
    exit;
}

$_SESSION['user_id']   = $user['id'];
$_SESSION['user_role'] = $user['role'];

unset($user['password']);
echo json_encode($user);
?>