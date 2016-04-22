'use strict';

// Use API provided from MoEngage to make a data fetch call everytime there is a response from GCM to show notification.
importScripts("//cdn.jsdelivr.net/pouchdb/5.3.1/pouchdb.min.js");
var moeVar = {};
var sendDataToServerURL = "https://websdk.moengage.com";
var getDataFromServerURL = "https://websdk.moengage.com/get/webpush/payload";
var moeDB = new PouchDB('moe_database');
var campaignID;
var subscriptionId;


function constructGet(url, params) {
    url = url + "?"
    for (var key in params) {
        url += key + "=" + params[key] + "&"
    }
    return url;
};

function track_event(eventName, attrs, flag) {
    attrs = typeof attrs !== 'undefined' ? attrs : {};
    if ((typeof(eventName) != "string") || (typeof(attrs) != "object") || (typeof(eventName) == "")) {
        debug_mode && alert("User attributes(key) needs to be string and (value) = string/int/float/boolean. The type you gave is " + typeof(eventName));
        return;
    }
    moeDB.get('moe_variables').then(function(get_data) {
        var post_data = {
            "e": eventName,
            "a": attrs
        };
        if(flag)
            post_data["f"]=1
        else
            post_data["f"]=0

        var url_cons = sendDataToServerURL + "/v2/report/add";
        var now = new Date;

        var utc_timestamp = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());

        get_data.uid.data["device_ts"] = Number(utc_timestamp);
        get_data.uid.data["push_id"] = subscriptionId;
        var url = constructGet(url_cons, get_data.uid.data)
        fetch(url, {
                method: 'POST',
                body: JSON.stringify(post_data)
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(result) {})
            .catch(function(error) {});

    })
};

function splitEndPointSubscription(subscriptionDetails) {
    var endpointURL = 'https://android.googleapis.com/gcm/send/',
        endpoint = subscriptionDetails.endpoint;
    if (endpoint.indexOf(endpointURL) === 0) {
        return subscriptionId = endpoint.replace(endpointURL, '');
    }
    return subscriptionDetails.subscriptionId;
};

function showNotification(title, body, icon, tag, data) {
    console.log('showNotification');
    var notificationOptions = {
        body: body,
        icon: icon ? icon : '/images/touch/chrome-touch-icon-192x192.png',
        tag: tag,
        data: data
        // actions: [  
        //    {action: 'like', title: 'Like'},  
        //    {action: 'reply', title: 'Reply'}]  
    };
    return self.registration.showNotification(title, notificationOptions);
};

// Event listener on Install and Activate enables service worker new version as soon as page loads
self.addEventListener('install', function(event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', function(evt) {
    moeDB.get('moe_variables', function(err, doc) {
        if (err) {
            moeDB.put({
                _id: 'moe_variables',
                uid: evt.data
            }, function callback(err, result) {
                if (!err) {
                    console.log('Successfully posted a todo!');
                } else {
                    console.log('resut', result);
                }
            });
        } else {
            moeDB.put({
                _id: 'moe_variables',
                _rev: doc._rev,
                uid: evt.data
            }, function(err, response) {
                if (err) {
                    return console.log(err);
                }
            });
        }
    });
});

self.addEventListener('push', function(event) {
    if (!(self.Notification && self.Notification.permission === 'granted')) {
        console.error('Failed to display notification - not supported');
        return;
    }
    event.waitUntil(
        moeDB.get('moe_variables').then(function(doc) {
            moeVar = doc.uid.data;
            return doc
        })
        .then(function(data) {
            return self.registration.pushManager.getSubscription()
        })
        .then(function(subscription) {
            subscriptionId = splitEndPointSubscription(subscription);
            var MOE_API_ENDPOINT2 = getDataFromServerURL + "?";
            MOE_API_ENDPOINT2 += "app_id=" + moeVar.app_id + "&" + "unique_id=" + moeVar.unique_id
            return fetch(MOE_API_ENDPOINT2)
        })
        .then(function(response) {
            if (response.status !== 200) {
                // Throw an error so the promise is rejected and catch() is executed
                throw new Error('Invalid status code from API: ' +
                    response.status);
            }
            console.log(response)
            return response.json();
        })
        .then(function(data) {
            console.log(data)
            // Get Campaign ID and notification data from here
            campaignID = (data.cid);

            track_event("i", {
                "cid": campaignID
            }, 1);
            var title = (data.payload && data.payload.title) || 'Glad to have you on board';
            var message = (data.payload && data.payload.messagr) || 'Welcome'
            var icon = (data.payload && data.payload.icon) || 'images/touch/chrome-touch-icon-192x192.png';


            var notificationFilter = {
                tag: (data && data.cid) || 'moe-id' // Mostly we will have this as Campaign ID.
            };

            var notificationData = {
                url: (data.payload && data.payload.urlToOpen) || 'http://www.moengage.com'
            };
            // return null;

            return showNotification(title, message, icon, notificationFilter, notificationData);
        })
        .catch(function(err) {
            console.error('A Problem occured with handling the push msg', err);
            var title = 'An error occured';
            var message = 'We were unable to get the information for this ' +
                'push message';
            // return null;
            return showNotification(title, message);
        })
    );
});

self.addEventListener('notificationclick', function(event) {
    // Call our tracking function here after notification Click
    track_event("c", {
        "cid": campaignID
    },1);
    if (event.notification.data && event.notification.data.url) {
        var url = event.notification.data.url;
    }
    event.notification.close();
    // event.waitUntil(clients.openWindow(url));

    event.waitUntil(
        clients.matchAll({
            type: "window"
        })
        .then(function(clientList) {
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );


});