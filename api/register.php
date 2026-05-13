<?php
require 'config.php';

$data = json_decode(file_get_contents('php://input'), true);
$name     = trim($data['name'] ?? '');
$email    = trim($data['email'] ?? '');
$password = $data['password'] ?? '';
$role     = $data['role'] ?? 'student';

// Validation
if (!$name || !$email || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email address']);
    exit;
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['error' => 'Password must be at least 6 characters']);
    exit;
}

if (!in_array($role, ['student', 'admin'])) {
    $role = 'student';
}

// Check if email already exists
$stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);
if ($stmt->fetch()) {
    http_response_code(409);
    echo json_encode(['error' => 'Email already registered']);
    exit;
}

// Hash the password (for new users, not demo 'any')
$hash = password_hash($password, PASSWORD_DEFAULT);
$stmt = $pdo->prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)");
$stmt->execute([$name, $email, $hash, $role]);

$userId = $pdo->lastInsertId();

// Auto-login after registration
$_SESSION['user_id'] = $userId;
$_SESSION['user_role'] = $role;

echo json_encode([
    'id'    => (int)$userId,
    'name'  => $name,
    'email' => $email,
    'role'  => $role
]);
?>