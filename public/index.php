<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Locate base directory (supports both standard layout and separated InfinityFree laravel_core)
$baseDir = __DIR__.'/..';
if (!file_exists($baseDir.'/vendor/autoload.php') && file_exists(__DIR__.'/../laravel_core/vendor/autoload.php')) {
    $baseDir = __DIR__.'/../laravel_core';
}

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = $baseDir.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require $baseDir.'/vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once $baseDir.'/bootstrap/app.php';

$app->handleRequest(Request::capture());

