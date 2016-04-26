  eval(function(p, a, c, k, e, d) {
     e = function(c) {
         return c
     };
     if (!''.replace(/^/, String)) {
         while (c--) {
             d[c] = k[c] || c
         }
         k = [function(e) {
             return d[e]
         }];
         e = function() {
             return '\\w+'
         };
         c = 1
     };
     while (c--) {
         if (k[c]) {
             p = p.replace(new RegExp('\\b' + e(c) + '\\b', 'g'), k[c])
         }
     }
     return p
 }('8 7={"6":5,"4":"3 2","1":"0"};', 9, 9, 'Desktop|form_factor|Chrome|Google|complete_device_name|false|is_mobile|moe_os_info|var'.split('|'), 0, {}));

 /* Since I am making an ajax call in moe function, these 
    functions need to be defined globally so that they can
    be initialized once ajax call promise returns back.
 */
 var moeSubscribeUserSwap;
 var moeUnSubscribeUserSwap;
 var moeCheckPushSubscriptionStatus;
 var moeLoadBanner;
 var moeRemoveBanner;
 var moeOpenSubDomain;
 var moeCloseBanner;

 var createObjFromURI = function() {
    var uri = decodeURI(location.search.substr(1));
    var chunks = uri.split('&');
    var params = Object();

    for (var i=0; i < chunks.length ; i++) {
        var chunk = chunks[i].split('=');
        if(chunk[0].search("\\[\\]") !== -1) {
            if( typeof params[chunk[0]] === 'undefined' ) {
                params[chunk[0]] = [chunk[1]];

            } else {
                params[chunk[0]].push(chunk[1]);
            }


        } else {
            params[chunk[0]] = chunk[1];
        }
    }

    return params;
};

var dataToServiceWorker = createObjFromURI();
if(dataToServiceWorker[""] == undefined){
    delete dataToServiceWorker[""]
}

 // Web Push functions closed //

 var moe = moe || (function(data) {
     var baseDomainName = "https://websdk.moengage.com";
     // var debug_mode = 1;
     var debug_mode = 0;
     var initialize = 0;
     var sdk_version = "3.0"
     var userStructure = {
         "user_attr": {},
         "event_queue": [],
         "user_attr_queue": [],
         "device_add": false
     };
     var guid = function() {
         function s4() {
             return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
         }
         debug_mode && console.log("Generating new unique_id")

         return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
     };
     var first_event_queue = 0;
     var first_user_attr_queue = 0;
     var clearQueue_counter = 0;
     var retry_limit = 5;
     var subscriptionId;
     var isIncognitoFlag;



     // Check for browser Name and Version Starts
     var brwVer;
     var sBrowser, sUsrAg = navigator.userAgent;
     if (sUsrAg.indexOf("Chrome") > -1) {
         var brw = sUsrAg;
         var res = brw.split("Chrome/");
         var res1 = res[0];
         var res2 = res[1].split(" ");
         brwVer = res2[0];
         sBrowser = "Google Chrome";
     } else if (sUsrAg.indexOf("Safari") > -1) {
         var brw = sUsrAg;
         var res = brw.split("Version/");
         var res1 = res[0];
         var res2 = res[1].split(" ");
         brwVer = res2[0];
         sBrowser = "Apple Safari";
     } else if (sUsrAg.indexOf("Firefox") > -1) {
         debugger;
         var brw = sUsrAg;
         var res = brw.split("Firefox/");
         brwVer = res[1];
         sBrowser = "Mozilla Firefox";
     } else {
         brwVer = "0.0"
         sBrowser = "Others";
     };

     var isMobile = {
         Windows: function() {
             return /IEMobile/i.test(navigator.userAgent);
         },
         Android: function() {
             return /Android/i.test(navigator.userAgent);
         },
         BlackBerry: function() {
             return /BlackBerry/i.test(navigator.userAgent);
         },
         iOS: function() {
             return /iPhone|iPad|iPod/i.test(navigator.userAgent);
         }
     };

     var makePost = function(url, get_params, post_params, callback) {
         var r = new XMLHttpRequest();
         url = constructGet(url, get_params)
         r.open("POST", url, true);
         r.onreadystatechange = function() {
             if (r.readyState != 4)
                 return;
             if (callback)
                 callback(r.responseText, r.status);
         };
         r.send(JSON.stringify(post_params));
     }
     var constructGet = function(url, params) {
         url = url + "?"
         for (var key in params) {
             url += key + "=" + params[key] + "&"
         }
         return url;
     };

     var set_item = function(data) {
         err = "";
         try {
             localStorage.setItem("moengage_data", JSON.stringify(data));
         } catch (err) {
             debug_mode && console.log("Cannot set Item", err);
         }
     };

     var track_event = function(eventName, attrs) {
         attrs = typeof attrs !== 'undefined' ? attrs : {};
         if ((typeof(eventName) != "string") || (typeof(attrs) != "object") || (typeof(eventName) == "")) {
             debug_mode && alert("User attributes(key) needs to be string and (value) = string/int/float/boolean. The type you gave is " + typeof(eventName));
             return;
         }
         collectData().then(function(get_data) {
             date = new Date();
             post_data = {
                 "e": eventName,
                 "a": attrs
             };

             makePost(baseDomainName + "/v2/report/add", get_data, post_data, function(data, status) {
                 if ((status == 500) || (status == 0)) {
                     debug_mode && alert("server error");
                     return;
                 }
             });

         })
     };


     var collectData = function() {
         // required = ["os", "app_id", "os_ver", "sdk_ver", "model", "app_ver","device_ts","device_tz", "unique_id"]
         // OS should be window.navigator.platform hardcoding to android as of now
         // app version should be window.navigator.appVersion, hardcoding as of now

         var now = new Date;
         var utc_timestamp = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
         promise = new Promise(function(resolve) {
                 get_params = dataToServiceWorker;
                 if (subscriptionId) {
                     get_params["push_id"] = subscriptionId;
                 }
                 resolve(get_params);
         })
         return promise
     }


     /* Web Push Code Added By Swapnil on 30th March 2016
      * Adding Function for Subscribe User, Unsubscribe User, Set up Push Permission  self.moe_data["app_id"]
      */



    var webPushFunctions = function(webSettings){
        var httpsFlag = true;

         var registerServieWorker = function() {
             if ('serviceWorker' in navigator) {
                 navigator.serviceWorker.register('service-worker46.js', {
                     scope: './'
                 });
             } else {
                 console.log('Servie Worker Not Supported');
             }
         }

         var subscriptionUpdate = function(subscription, param) {
             if (!subscription) {
                 subscriptionId = null;
                 
                 if (param == 'unsubscribed') {
                     track_event("MOE_USER_UNSUBSCRIBED", {
                         'MOE_WEB_PUSH_TOKEN': 'false'
                     });
                 } else if (param == undefined) {
                    track_event("MOE_USER_SUBSCRIPTION_CHECK", {
                        'MOE_WEB_PUSH_TOKEN': 'false'
                    });
                 };
                 dataToServiceWorker['push_id'] = subscriptionId;
                 navigator.serviceWorker.controller.postMessage({
                                 'data': dataToServiceWorker
                });
                 return;
             }
             endpointSections = subscription.endpoint.split('/');
             subscriptionId = endpointSections[endpointSections.length - 1];
             dataToServiceWorker['push_id'] = subscriptionId;
             navigator.serviceWorker.controller.postMessage({
                                 'data': dataToServiceWorker
             });

             if (param == 'subscribed') {
                 track_event("MOE_USER_SUBSCRIBED", {
                     'MOE_WEB_PUSH_TOKEN': subscriptionId
                 });
             } else if (param == undefined) {
                 track_event("MOE_USER_SUBSCRIPTION_CHECK", {
                     'MOE_WEB_PUSH_TOKEN': subscriptionId
                 });
             }

         };

         moeSubscribeUserSwap = function() {

             // We need the service worker registration to access the push manager
             navigator.serviceWorker.ready
                 .then(function(serviceWorkerRegistration) {
                     return serviceWorkerRegistration.pushManager.subscribe({
                         userVisibleOnly: true
                     });
                 })
                 .then(function(subscription) {
                     subscriptionUpdate(subscription, 'subscribed');
                     window.close(); // Close popup after getting user permission
                 })
                 .catch(function(subscriptionErr) {
                     console.log('User Subscription Error', subscriptionErr);

                     // Check for a permission prompt issue
                     return navigator.permissions.query({
                             name: 'push',
                             userVisibleOnly: true
                         })
                         .then(function(permissionState) {
                             console.log(permissionState.state, "Permission State")
                             // window.PushDemo.ui.setPushChecked(false);
                             if (permissionState.state !== 'denied' &&
                                 permissionState.state !== 'prompt') {
                                 // If the permission wasnt denied or prompt, that means the
                                 // permission was accepted, so this must be an error
                             }

                             if (permissionState.state == 'denied') {
                                 window.close(); // Close popup after getting user permission
                             }
                         });
                 });
         };

         moeUnSubscribeUserSwap = function() {
             navigator.serviceWorker.ready
                 .then(function(serviceWorkerRegistration) {
                     return serviceWorkerRegistration.pushManager.getSubscription();
                 })
                 .then(function(pushSubscription) {
                     // Check we have everything we need to unsubscribe
                     if (!pushSubscription) {
                         // User is already unsubscribed from our system. Make call to sync with server
                         subscriptionUpdate(null);
                         return;
                     }
                     return pushSubscription.unsubscribe()
                         .then(function(successful) {
                             if (!successful) {
                                 // The unsubscribe was unsuccessful, but we can
                                 // remove the subscriptionId from our server
                                 // and notifications will stop
                                 // This just may be in a bad state when the user returns
                                 console.error('We were unable to unregister from push');
                             }
                         })
                         .catch(function(e) {});
                 })
                 .then(function() {
                     // Unsubscribe user from this call
                     subscriptionUpdate(null, 'unsubscribed');
                 })
                 .catch(function(e) {
                     console.error('Error thrown while revoking push notifications. ' +
                         'Most likely because push was never registered', e);
                 });
         };

         moeCheckPushSubscriptionStatus = function() {
             if ('serviceWorker' in navigator && (sBrowser == "Google Chrome")) {
                 navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
                         // Let's see if we have a subscription already
                         return serviceWorkerRegistration.pushManager.getSubscription();
                     })
                     .then(function(subscription) {
                         if (!subscription) {
                             subscriptionUpdate(null);
                             moeSubscribeUserSwap();
                             return;
                         }
                         // Update the current state with the
                         // subscriptionid and endpoint
                         subscriptionUpdate(subscription);
                         
                         
                     })
                     .catch(function(err) {
                         console.log('PushClient.setUpPushPermission() Error', err);
                     });
             } else {
                 console.log('Push Notification not allowed');
             }
         }

         if (httpsFlag == true) {
             registerServieWorker(); // Registering a service worker on load

             // Testing
             navigator.serviceWorker.ready
                 .then(function(serviceWorkerRegistration) {
                     return serviceWorkerRegistration.pushManager.getSubscription();
                 })
                 .then(function(pushSubscription) {
                     // Check we have everything we need to unsubscribe
                     if (!pushSubscription) {
                         // User is already unsubscribed from our system. Make call to sync with server
                         subscriptionUpdate(null);
                         moeCheckPushSubscriptionStatus();
                         return;
                     }
                     return pushSubscription.unsubscribe()
                         .then(function(successful) {
                             moeCheckPushSubscriptionStatus();
                             if (!successful) {
                                 // The unsubscribe was unsuccessful, but we can
                                 // remove the subscriptionId from our server
                                 // and notifications will stop
                                 // This just may be in a bad state when the user returns
                                 console.error('We were unable to unregister from push');
                             }
                         })
                         .catch(function(e) {});
                 })
                 .then(function() {
                     // Unsubscribe user from this call
                     subscriptionUpdate(null, 'unsubscribed');
                     moeCheckPushSubscriptionStatus();
                 })
                 .catch(function(e) {
                     console.error('Error thrown while revoking push notifications. ' +
                         'Most likely because push was never registered', e);
                          moeCheckPushSubscriptionStatus();
                 });
             // Testing
             
         } 
         
     }

     webPushFunctions();
     /* Web Push Code End
      * Below is the return call of MOE function
      */

     return true;

 }());