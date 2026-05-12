<?php
class Database {
    private $host = "localhost";
    private $db_name = "feedback_portal";  // تأكد من الاسم صحيح
    private $username = "root";             // المستخدم في XAMPP
    private $password = "";                 // كلمة السر فارغة في XAMPP
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO("mysql:host=" . $this->host . ";dbname=" . $this->db_name, 
                                  $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->exec("set names utf8");
        } catch(PDOException $exception) {
            echo "Connection error: " . $exception->getMessage();
        }
        return $this->conn;
    }
}
?>