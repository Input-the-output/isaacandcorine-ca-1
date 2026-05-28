<?php

function load_env($path)
{
    if (!file_exists($path)) {
        return false;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    foreach ($lines as $line) {
        $line = trim($line);

        if ($line === "" || str_starts_with($line, "#")) {
            continue;
        }

        if (strpos($line, "=") !== false) {
            [$key, $value] = explode("=", $line, 2);

            $key = trim($key);
            $value = trim($value);

            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }

    return true;
}