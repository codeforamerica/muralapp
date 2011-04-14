Ext.setup({
	tabletStartupScreen: 'tablet_startup.png',
	phoneStartupScreen: 'phone_startup.png',
	icon: 'icon.png',
	glossOnIcon: false,
	onReady: function() {
		var panel, listing, mapPanel, markers = [];
		
		function getCoorInPhilly () {
			var allCoords = [];
			// City Hall
			allCoords.push({
				latitude: 39.95185892663003,
				longitude: -75.16382217407227
			});
			
			// Center City East
			allCoords.push({
				latitude: 39.94955601195755,
				longitude: -75.15103340148926
			});
			
			// Temple
			allCoords.push({
				latitude: 39.98027708862263,
				longitude: -75.15541076660156
			});
			
			// Passyunk Square
			allCoords.push({
				latitude: 39.93349925254218,
				longitude: -75.16433715820312
			});
			
			// Girard & 2nd
			allCoords.push({
				latitude: 39.969819000030895,
				longitude: -75.13936042785645
			});
			console.log(allCoords);
			var randomNumber = parseInt(Math.random() * allCoords.length);
			console.log(randomNumber);
			return allCoords[randomNumber];
			
		}
		
		listing = new Ext.Component({
			title: "Listing",
			scroll: 'vertical',
			tpl: [
			  '<tpl for=".">',
			  '	<div class="tweet">',
			  '		<div class="avatar"><img src="{profile_image_url}" /></div>',
			  '		<div class="tweet-content">',
			  '			<h2>{from_user}</h2>',
			  '			<p>{text}</p>',
			  '		</div>',
			  '	</div>',
			  '</tpl>'
			]
		});
		
		mapPanel = new Ext.Map({
			title: "Map",
			useCurrentLocation: true
		});
		
		panel = new Ext.TabPanel({
			fullscreen: true,
			cardSwitchAnimation: 'slide',
			ui: 'light',
			items: [mapPanel, listing]
		});
		
		addMarker = function(tweet) {
			var latLng = new google.maps.LatLng(tweet.geo.coordinates[0], tweet.geo.coordinates[1]);

			var marker = new google.maps.Marker({
				map: mapPanel.map,
				position: latLng
			});
			
			markers.push(marker);

			google.maps.event.addListener(marker, "click", function() {
				tweetBubble.setContent(tweet.text);
				tweetBubble.open(mapPanel.map, marker);
			});
		};
		
		clearMarkers = function() {
			for(var i=0; i < markers.length; i++) {
				markers[i].setMap(null);
			}
			markers = [];
		}
		tweetBubble = new google.maps.InfoWindow();
		
		refresh = function() {
			// Un comment the line below to actually use the GPS on the phone;
			//var coords = mapPanel.geo.coords;
			var coords = getCoorInPhilly();
			console.log(coords);
			var testMap = mapPanel;
			console.log(testMap);
			
			Ext.util.JSONP.request({
				url: 'http://search.twitter.com/search.json',
				callbackKey: 'callback',
				params: {
					geocode: coords.latitude + ',' + coords.longitude + ',5mi',
					rpp: 30,
					uniqueify: Math.random()
				},
				callback: function(data) {
					var tweetList = data.results;
					listing.update(tweetList);
					
					clearMarkers();
					
					// Add points to the map
					for(var i=0, ln = tweetList.length; i < ln; i++){
						var tweet = tweetList[i];
						if(tweet.geo && tweet.geo.coordinates) {
							addMarker(tweet);
						}
					}
				}
			})			
		}
		
		panel.getTabBar().add([
			{ xtype: 'spacer'},
			{
				xtype: 'button',
				iconMask: true,
				iconCls: 'refresh',
				ui: 'plain',
				style: 'margin:0;',
				handler: refresh
			}
		]);
		
		panel.getTabBar().doLayout();
		
		mapPanel.geo.on('update', refresh);
	}
});