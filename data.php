<?php
try {
    // Set the directory where the files will be stored
    $dataDir = __DIR__ . DIRECTORY_SEPARATOR . 'data';

    // check cors
    if (get_header('Sec-Fetch-Dest') !== 'empty') {
        http_response_code(500);
        die('access denied');
    }
    if (get_header('Sec-Fetch-Mode') !== 'cors') {
        http_response_code(500);
        die('access denied');
    }
    if (get_header('Sec-Fetch-Site') !== 'same-origin') {
        http_response_code(500);
        die('access denied');
    }
    if (!isLocalhostOrSSL()) {
        http_response_code(500);
        die('access denied');
    }

    // delete old files
    deleteOldFiles($dataDir);

    switch ($_SERVER['REQUEST_METHOD']) {
        case 'PUT':

            $bearer_token = get_bearer_token();
            if ($bearer_token) {
                if (!validateSecret($bearer_token)) {
                    http_response_code(500);
                    die('access denied');
                }
            } else {
                http_response_code(500);
                die('access denied');
            }

            // Handle PUT request - save the body content to a file
            $input = file_get_contents('php://input');
            $key = createKey();

            if (strlen($input) > (50 * 1024 * 1024)) {
                http_response_code(400);
                die('max 50 MB');
            }

            $filePath = $dataDir . DIRECTORY_SEPARATOR . $key . '.bin';
            if (file_put_contents($filePath, $input) !== false) {
                echo $key;
            } else {
                http_response_code(500);
            }
            break;

        case 'GET':

            // Handle GET request - return the file content
            if (!empty($_GET['accessKey'])) {
                $t = time();
                echo json_encode(['accessKey' => base_convert((string)$t, 10, 36) . '-' . md5($t . 'JdiqJ03hHS2')]);
                exit;
            }

            // Handle GET request - return the file content
            if (empty($_GET['id'])) {
                http_response_code(400);
                echo "Bad Request";
                exit;
            }

            $fileName = validateKey($_GET['id']);
            $filePath = $dataDir . DIRECTORY_SEPARATOR . $fileName . '.bin';

            if (file_exists($filePath)) {
                header('Content-Type: application/octet-stream');
                readfile($filePath);
                deleteIfMaxOpenings($filePath); // evtl löschen.
            } else {
                http_response_code(404);
                echo "Not found";
                exit;
            }
            break;

        default:
            http_response_code(405);
            echo "Method Not Allowed.";
    }
} catch (Throwable $ex) {
    if (!headers_sent()) {
        http_response_code(500);
    }
    die('internal error');
}

// -----------------------------
// FUNCTIONS
// -----------------------------

function createKey() {
    $key = base_convert((string)time(), 10, 36) . chr(rand(65, 90));
    $list = 'qwertzuiopasdfghjklyxcvbnm';
    $list .= strtoupper($list);
    $list .= '0123456789_';

    while (strlen($key) < 40) {
        $key .= $list[mt_rand(0, strlen($list) - 1)];
    }

    $key .= chr(rand(65, 90));
    return $key;
}

function validateKey($key) {
    return preg_replace('/[^a-zA-Z0-9\-_]/', '', $key);
}

function validateSecret($key) {
    // Define the secret used during key generation
    $secret = 'JdiqJ03hHS2';

    // Split the key into its components (timestamp and hash)
    list($encoded_time, $hash) = explode('-', $key, 2);

    // Convert the encoded time back to the original timestamp
    $time = base_convert($encoded_time, 36, 10);

    // Recalculate the hash using the decoded timestamp and the secret
    $expected_hash = md5($time . $secret);

    // Check if the hash matches
    if ($hash !== $expected_hash) {
        return false;  // Invalid hash
    }

    // Check if the timestamp is within +/- 1 minute
    if (abs(time() - $time) <= 30) {
        return true;  // Valid key
    }

    return false;  // Invalid timestamp
}

function get_header($headerName) {

    if (isset($_SERVER[$headerName])) {
        return trim($_SERVER[$headerName]);
    } elseif (isset($_SERVER['HTTP_' . str_replace('-', '_', strtoupper($headerName))])) { // Nginx or fast CGI
        return trim($_SERVER['HTTP_' . str_replace('-', '_', strtoupper($headerName))]);
    } elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        foreach ($requestHeaders as $key => $value) {
            if (strtolower($key) == strtolower($headerName)) {
                return $value;
            }
        }
    }
    return null;
}

function get_bearer_token() {
    $headers = get_header('Authorization');

    // Extract the Bearer token from the Authorization header
    if (!empty($headers) && preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
        return $matches[1];
    }

    return null; // No token found
}


function deleteOldFiles($directory) {
    if (!is_dir($directory)) {
        return;
    }
    $dir = opendir($directory);
    if ($dir === false) {
        return;
    }

    // Loop through the directory
    while (($file = readdir($dir)) !== false) {
        if (!str_ends_with($file, '.bin')) {
            continue;
        }

        $filePath = $directory . DIRECTORY_SEPARATOR . $file;
        if (is_file($filePath)) {
            $days = readDaysFromFile($filePath);

            if (getCreateTime($filePath) < (time() - ($days * 3600 * 24))) {
                unlink($filePath);
            }
        }
    }

    // Close the directory
    closedir($dir);
}

function deleteIfMaxOpenings($filePath) {

    // Open the file for reading and writing in binary mode
    $file = fopen($filePath, 'r+b');
    if (!$file) {
        return;
    }

    // Read the first byte
    $openings = ord(fread($file, 1));  // Read the first byte and convert to integer

    if ($openings === 0) {
        fclose($file);
        unlink($filePath);

    } else {
        fseek($file, 0);
        fwrite($file, chr($openings - 1));

        fseek($file, 2);
        for ($i = 2; $i < 10; $i++) {
            fwrite($file, chr(rand(0, 0xFF))); // write some noise on the first 10 bytes
        }

        fclose($file); // Close the file
    }
}

function readDaysFromFile($filePath) {
    $file = fopen($filePath, 'r+b');
    if (!$file) {
        return 0;
    }

    // Read the first byte
    fseek($file, 1);
    $days = ord(fread($file, 1));  // Das zweite byte lesen
    fclose($file);

    return min(60, $days);
}

function isLocalhostOrSSL() {
    // Check if running on localhost (127.0.0.1 or localhost)
    if (isset($_SERVER['REMOTE_ADDR']) && ($_SERVER['REMOTE_ADDR'] === '127.0.0.1' || $_SERVER['REMOTE_ADDR'] === '::1')) {
        return true;
    }

    // Check if the connection is secure (using SSL)
    if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
        return true;
    }
    return false;
}

function getCreateTime($filePath) {
    $filename = basename($filePath);
    $matches = [];
    if (preg_match('/(^[0-9a-z]{5,})[A-Z]/', $filename, $matches)) {
        return (int)base_convert($matches[1], 36, 10);
    }
    return 0;
}
