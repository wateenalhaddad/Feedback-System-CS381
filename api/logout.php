<?php
// Force same session save path as config.php
ini_set('session.save_path', '/tmp');
session_start();

// Destroy all session data
$_SESSION = [];

// Remove the session cookie
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 86400, 
        $params["path"], $params["domain"], 
        $params["secure"], $params["httponly"]
    );
}

// Destroy the session file
session_destroy();

// Manually delete the session file from /tmp
$session_id = session_id();
if ($session_id) {
    $file = '/tmp/sess_' . $session_id;
    if (file_exists($file)) {
        unlink($file);
    }
}

// Also delete any other session files for this user (just in case)
foreach (glob('/tmp/sess_*') as $file) {
    if (is_file($file) && filemtime($file) < time() - 3600) {
        // Optionally clean old sessions, but avoid deleting all
    }
}

header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');
echo json_encode(['success' => true]);
?>