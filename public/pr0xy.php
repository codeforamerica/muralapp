<?php
// PHP Proxy example for Yahoo! Web services. 
// Responds to both HTTP GET and POST requests
//
// Author: Jason Levitt
// December 7th, 2005
//

// Allowed hostname (api.local and api.travel are also possible here)
define ('HOSTNAME', 'http://www.muralfarm.org/Muralfarm/RssFeed.ashx');

// Get the REST call path from the AJAX application
// Is it a POST or a GET?
$path = '?'.$_SERVER['QUERY_STRING'];  // Yeah, dangerous, I know. #todo
$url = HOSTNAME.$path;

// Open the Curl session
$session = curl_init($url);

// If it's a POST, put the POST data in the body
//if ($_POST['yws_path']) {
if(in_array('yws_path', array_keys($_POST))) {
	$postvars = '';
	while ($element = current($_POST)) {
		$postvars .= urlencode(key($_POST)).'='.urlencode($element).'&';
		next($_POST);
	}
	curl_setopt ($session, CURLOPT_POST, true);
	curl_setopt ($session, CURLOPT_POSTFIELDS, $postvars);
}

// Don't return HTTP headers. Do return the contents of the call
curl_setopt($session, CURLOPT_HEADER, false);
curl_setopt($session, CURLOPT_RETURNTRANSFER, true);

// Make the call
$xml = curl_exec($session);

error_log(gettype($xml));

// The web service returns XML. Set the Content-Type appropriately
header("Content-Type: text/xml");

//$arr = simplexml_load_string($xml);
//error_log(print_r($arr->channel->item[0]->georss, true));
//$json = '('.json_encode($arr).');';
//error_log(print_r($json, true));
//error_log(print_r($jsonContent, true));
echo $xml;
curl_close($session);

?>