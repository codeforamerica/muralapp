<?php
// Allowed hostname (api.local and api.travel are also possible here)
define ('HOSTNAME', 'http://muralapp.iriscouch.com');

// Get the REST call path from the AJAX application
// Is it a POST or a GET?
$proxy_params = explode('&',$_SERVER['QUERY_STRING']);
//error_log('prox_params = ' . print_r($proxy_params, true));
//error_log(print_r($proxy_params, true));
//error_log(count($proxy_params));
if(count($proxy_params) > 0) {
    $page_url = explode('=',array_shift($proxy_params));
    $page_url = $page_url[1];
    $path = $page_url .'?'.implode('&',$proxy_params);
    $url = HOSTNAME.$path;
}

//error_log($url);

// Open the Curl session
$session = curl_init($url);

//error_log(print_r($_REQUEST, true));

// We have to pull our document from the php://input - yeah, I'd never heard of it either.
$post_body = file_get_contents('php://input');

//error_log($post_body);
// If it's a POST, put the POST data in the body
//if ($_POST['yws_path']) {
if($post_body != '') {
//error_log('herro');
	curl_setopt ($session, CURLOPT_POST, true);
	curl_setopt ($session, CURLOPT_POSTFIELDS, $post_body);
}

// Don't return HTTP headers. Do return the contents of the call
curl_setopt($session, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
curl_setopt($session, CURLOPT_RETURNTRANSFER, true);

// Make the call
$json = curl_exec($session);

//error_log($json);
// The web service returns XML. Set the Content-Type appropriately
header("Content-Type: application/json");

//$arr = simplexml_load_string($xml);
//error_log(print_r($arr->channel->item[0]->georss, true));
//$json = '('.json_encode($arr).');';
//error_log(print_r($json, true));
//error_log(print_r($jsonContent, true));
echo $json;
curl_close($session);

?>