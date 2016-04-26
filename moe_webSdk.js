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

     var osName = "web";
     var osPlatform;
     // Check for Mobile Web or Web Platform
     if (moe_os_info && moe_os_info.is_mobile == false) {
         osName = "web";
         osPlatform = navigator.userAgent;
     } else if (moe_os_info && moe_os_info.is_mobile == true) {
         osName = "mweb";
         if (isMobile.Windows()) {
             osPlatform = "Windows";
         } else if (isMobile.Android()) {
             osPlatform = "Android";
         } else if (isMobile.BlackBerry()) {
             osPlatform = "BlackBerry";
         } else if (isMobile.iOS()) {
             osPlatform = "iOS";
         } else {
             osPlatform = navigator.userAgent;
         }
     };
     //Making osName and osPlatform web again for now
     osName = "web";
     osPlatform = navigator.userAgent;
     // Check for browser Name and Version Ends
     var clearQueue = function() {
         if (clearQueue_counter > retry_limit)
             return;
         clearQueue_counter += 1;
         if ((userStructure["event_queue"].length < first_event_queue) || (userStructure["user_attr_queue"].length < first_user_attr_queue)) {
             clearQueue_counter = 0;
         }
         if (("event_queue" in userStructure) && (userStructure["event_queue"].length != 0)) {
             collectData().then(function(get_data) {
                 post_data = userStructure["event_queue"].pop();
                 makePost(baseDomainName + "/v2/report/add", get_data, post_data, function(data) {
                     if (data == "")
                         data = {}
                     else
                         data = JSON.parse(data);
                     if (("status" in data) && (data.status == "success")) {
                         debug_mode && console.log(data)
                     } else {
                         debug_mode && console.log("not sent queued!")
                         userStructure['event_queue'].push(post_data);
                     }
                     // localStorage.setItem("moengage_data", JSON.stringify(userStructure));
                     set_item(userStructure);
                 });

             });
         }
         if (("user_attr_queue" in userStructure) && (userStructure["user_attr_queue"].length != 0)) {
             collectData().then(function(get_data) {
                 post_data = userStructure["user_attr_queue"].pop();
                 makePost(baseDomainName + "/v2/report/add", get_data, post_data, function(data) {
                     if (data == "")
                         data = {}
                     else
                         data = JSON.parse(data);
                     if (("status" in data) && (data.status == "success")) {
                         debug_mode && console.log(data)
                     } else {
                         debug_mode && console.log("not sent queued!")
                         userStructure['user_attr_queue'].push(post_data);
                     }
                     // localStorage.setItem("moengage_data", JSON.stringify(userStructure));
                     set_item(userStructure);
                 });
             });
         }
         first_event_queue = userStructure["event_queue"].length;
         first_user_attr_queue = userStructure["user_attr_queue"].length;
     };
     var set_item = function(data) {
         err = "";
         try {
             localStorage.setItem("moengage_data", JSON.stringify(data));
         } catch (err) {
             debug_mode && console.log("Cannot set Item", err);
         }
     };

     var getWedSDKSettings = function () {

        var promise = new Promise(function(resolve) {
             var hours = 24; // Reset when storage is more than 24hours
         var now = new Date().getTime(); // Get current time
         var setupTime = localStorage.getItem('moeWebSDKSettingsSetupTime');
         if (setupTime == null) {
             makeGet("https://websdk.moengage.com/websdksettings", {
                 "app_id": self.moe_data["app_id"]
             }, function(data) {
                 // data = JSON.parse(data);
                 if (typeof(data) == 'string') {
                     data = JSON.parse(data);
                 }
                 var newData = JSON.stringify(data);
                 localStorage.setItem('moeWebSDKSettingsSetupTime', now);
                 localStorage.setItem('moeWebSDKSettings', newData);
                 // webPushFunctions(data);
                 resolve(data);
             });


         } else {
             if (now - setupTime > hours * 60 * 60 * 1000) {

                 makeGet("https://websdk.moengage.com/websdksettings", {
                     "app_id": self.moe_data["app_id"]
                 }, function(data) {
                     // data = JSON.parse(data);
                     if (typeof(data) == 'string') {
                         data = JSON.parse(data);
                     }
                     var newData = JSON.stringify(data);
                     localStorage.removeItem('moeWebSDKSettings');
                     localStorage.removeItem('moeWebSDKSettingsSetupTime');
                     localStorage.setItem('moeWebSDKSettingsSetupTime', now);
                     localStorage.setItem('moeWebSDKSettings', newData)
                     // webPushFunctions(data);
                     resolve(data);
                 });
             } else {
                 var sdk_settings_data = JSON.parse(localStorage.getItem("moeWebSDKSettings"));
                 // webPushFunctions(sdk_settings_data);
                 resolve(sdk_settings_data);
             }
         }
         })
         return promise
     }
     var initializeSession = function() {
         isWindowIncognito().then(function(data) {
             self.moe_data["is_incognito"] = data
         })

         getWedSDKSettings().then(function(data){
            // if(data['webData']['call_push'] && data['webData']['call_push'] != 'client'){ Check for client calling. to be added in settings
            webPushFunctions(data);
            // }
         });


         if ("retry_limit" in self.moe_data)
             retry_limit = self.moe_data["retry_limit"];
         if ("debug_logs" in self.moe_data)
             debug_mode = self.moe_data["debug_logs"];
         if ("retry_time" in self.moe_data)
             retry_time = self.moe_data['retry_time'];
         else
             retry_time = 2000;
         if (typeof(Storage) !== "undefined") {
             temp = JSON.parse(localStorage.getItem("moengage_data"));
             if ((temp != null) && ('uuid' in temp)) {
                 userStructure = temp
                 debug_mode && console.log(temp);
             } else
                 userStructure['uuid'] = guid();
             //localStorage.setItem("moengage_data", JSON.stringify(userStructure));
             set_item(userStructure);
             if (("device_add" in userStructure) && (userStructure["device_add"] == true)) {
                 debug_mode && console.log("Already added");
                 initialize = 1;
             } else {
                 collectData().then(function(get_data) {
                     makePost(baseDomainName + '/v2/device/add', get_data, post_data = {}, function(data) {
                         if (data == "")
                             data = {}
                         else
                             data = JSON.parse(data);
                         if (("status" in data) && (data.status == "success")) {
                             debug_mode && console.log(data)
                             initialize = 1;
                         }
                     });
                     userStructure["device_add"] = true;
                     //localStorage.setItem("moengage_data", JSON.stringify(userStructure));
                     set_item(userStructure);
                 })
             }

             track_event("EVENT_ACTION_WEB_SESSION_START", {
                 "timestamp": Number(Date.now())
             });
             // prevFunction = window.onbeforeunload;

             // if (prevFunction == null)
             // {
             //   window.onbeforeunload = function(e){
             //     track_event("WEB_SESSION_STOP",{"timestamp": Number(Date.now())});
             //   };
             // }
             // else
             // {
             //   prevFunction = (function() {
             //     var cached_function = prevFunction;

             //     return function(str) {
             //         cached_function.apply(this, arguments);
             //         track_event("WEB_SESSION_STOP",{"timestamp": Number(Date.now())});
             //     };
             //   }());
             //   window.onbeforeunload = prevFunction;
             // }




         } else {
             debug_mode && console.log("Sorry, your browser does not support Web Storage...");
         }
         debug_mode && console.log(userStructure);
         setInterval(function() {
             clearQueue();
         }, retry_time);
     };


     //document.getElementById("output").html(guid());
     var validateData = function() {

         if (!self.moe_data) {
             debug_mode && console.log("Please pass data with moe like this moe({app_id:'t1'})")
             return false
         }
         if (!self.moe_data["app_id"]) {
             debug_mode && console.log("App Id is missing!")
             return false
         }

         initializeSession();

         if (!self.moe_data["app_id"]) {
             debug_mode && console.log("App Id is missing!")
             return false
         }
         return true
     }

     var makeGet = function(url, params, callback) {
         var r = new XMLHttpRequest();
         url = constructGet(url, params)
         r.open("GET", url, true);
         r.onreadystatechange = function() {
             if (r.readyState != 4 || r.status != 200) return;
             if (callback)
                 callback(r.responseText);
         };
         r.send();
     }
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
     }

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

             if (initialize == 0) {
                 if (!("event_queue" in userStructure)) {
                     userStructure['event_queue'] = []
                 }
                 debug_mode && console.log("not sent queued!")
                 userStructure['event_queue'].push(post_data);
                 // localStorage.setItem("moengage_data", JSON.stringify(userStructure));
                 set_item(userStructure);
                 return;
             }
             makePost(baseDomainName + "/v2/report/add", get_data, post_data, function(data, status) {
                 if ((status == 500) || (status == 0)) {
                     debug_mode && alert("server error");
                     return;
                 }
                 if (data == "")
                     data = {}
                 else
                     data = JSON.parse(data);
                 if (("status" in data) && (data.status == "success")) {
                     debug_mode && console.log(data);
                 } else {
                     if (!("event_queue" in userStructure)) {
                         userStructure['event_queue'] = []
                     }
                     debug_mode && console.log("not sent queued!")
                     userStructure['event_queue'].push(post_data);
                     // localStorage.setItem("moengage_data", JSON.stringify(userStructure));
                     set_item(userStructure);
                 }
             });

         })
     };

     var add_user_attribute = function(attrName, attrValue, hash) {
         if ((typeof(attrName) != "string") || (typeof(attrName) == "") || (typeof(attrValue) == "object")) {
             debug_mode && alert("User attributes(key) needs to be string and (value) = string]/int/float/boolean. The type you gave is " + typeof(attrName));
             return;
         }
         hash = typeof hash !== 'undefined' ? hash : '';
         collectData().then(function(get_data) {
             date = new Date();
             d = {}
             d[attrName] = attrValue
             post_data = {
                 "e": "EVENT_ACTION_USER_ATTRIBUTE",
                 "a": d,
                 "h": hash
             };

             if ((attrName in userStructure['user_attr']) && (userStructure['user_attr'][attrName] == attrValue)) {
                 return;
             } else {
                 userStructure['user_attr'][attrName] = attrValue;
                 // localStorage.setItem("moengage_data", JSON.stringify(userStructure));
                 set_item(userStructure);
                 if (initialize == 0) {
                     if (!("user_attr_queue" in userStructure)) {
                         userStructure['user_attr_queue'] = [];
                     }
                     debug_mode && console.log("not sent queued!");
                     userStructure['user_attr_queue'].push(post_data);
                     // localStorage.setItem("moengage_data", JSON.stringify(userStructure));
                     set_item(userStructure);
                     return;
                 }
                 makePost(baseDomainName + "/v2/report/add", get_data, post_data, function(data, status) {
                     if (status == 500) {
                         debug_mode && alert("server error");
                         return;
                     }
                     if (data == "")
                         data = {};
                     else
                         data = JSON.parse(data);
                     if (("status" in data) && (data.status == "success")) {
                         debug_mode && console.log(data);
                     } else {
                         if (!("user_attr_queue" in userStructure)) {
                             userStructure['user_attr_queue'] = [];
                         }
                         debug_mode && console.log("not sent queued!");
                         userStructure['user_attr_queue'].push(post_data);
                         // localStorage.setItem("moengage_data", JSON.stringify(userStructure));
                         set_item(userStructure);
                     }
                 });
             }
         });
     };

     var destroy_session = function(val, hash) {
         userStructure = {
             "user_attr": {},
             "event_queue": [],
             "user_attr_queue": [],
             "device_add": false
         };
         // localStorage.setItem("moengage_data", JSON.stringify(userStructure));
         set_item(userStructure);
         initializeSession();
     };

     var add_first_name = function(val, hash) {
         add_user_attribute('USER_ATTRIBUTE_USER_FIRST_NAME', val, hash);
     };

     var add_last_name = function(val, hash) {
         add_user_attribute('USER_ATTRIBUTE_USER_LAST_NAME', val, hash);
     };

     var add_email = function(val, hash) {
         add_user_attribute('USER_ATTRIBUTE_USER_EMAIL', val, hash);
     };

     var add_mobile = function(val, hash) {
         add_user_attribute('USER_ATTRIBUTE_USER_MOBILE', val, hash);
     };

     var add_user_name = function(val, hash) {
         add_user_attribute('USER_ATTRIBUTE_USER_NAME', val, hash);
     };

     var add_gender = function(val, hash) {
         add_user_attribute('USER_ATTRIBUTE_USER_GENDER', val, hash);
     };

     var add_birthday = function(val, hash) {
         add_user_attribute('USER_ATTRIBUTE_USER_BDAY', val, hash);
     };

     // var add_location = function(val, hash)
     // {
     //    add_user_attribute('moengage_ISLAT', val, hash);
     // };

     var add_unique_user_id = function(val, hash) {
         add_user_attribute('USER_ATTRIBUTE_UNIQUE_ID', val, hash);
     };

     var isWindowIncognito = function(cb) {
         var fs = window.RequestFileSystem || window.webkitRequestFileSystem;
         var promise = new Promise(function(resolve) {
             if (!fs) {
                 resolve(false);
             } else {
                 fs(window.TEMPORARY, 100, function() {
                         // the window object is NOT incognito
                         resolve(false);
                     },
                     function() {
                         // the window object is incognito
                         resolve(true);
                     });
             }
         })
         return promise
     }

     isWindowIncognito().then(function(isIncognito) {
         isIncognitoFlag = isIncognito;
     });

     var collectData = function() {
         // required = ["os", "app_id", "os_ver", "sdk_ver", "model", "app_ver","device_ts","device_tz", "unique_id"]
         // OS should be window.navigator.platform hardcoding to android as of now
         // app version should be window.navigator.appVersion, hardcoding as of now

         var now = new Date;
         var utc_timestamp = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
         promise = new Promise(function(resolve) {
             isWindowIncognito().then(function(isIncognito) {
                 get_params = {
                     "os": osName,
                     "os_platform": osPlatform,
                     "is_incognito": isIncognito,
                     "app_id": self.moe_data["app_id"],
                     "os_ver": sBrowser, // OS version is Browser Version
                     "sdk_ver": sdk_version,
                     "model": sBrowser, // Model is Browser Name
                     "app_ver": 1.0,
                     "device_ts": Number(utc_timestamp),
                     "device_tz_offset": new Date().getTimezoneOffset() * -60000,
                     "unique_id": userStructure['uuid'],
                     "device_tz": new Date().getTimezoneOffset()
                 };
                 if (subscriptionId) {
                     get_params["push_id"] = subscriptionId;
                 }
                 resolve(get_params);
             })
         })
         return promise
     }


     /* Web Push Code Added By Swapnil on 30th March 2016
      * Adding Function for Subscribe User, Unsubscribe User, Set up Push Permission  self.moe_data["app_id"]
      */

     var callWebPush = function() {
        getWedSDKSettings().then(function(data){
            if(data['webData']['call_push'] && data['webData']['call_push'] == 'client'){
            webPushFunctions(data);
            }
         })
     }

     var webPushFunctions = function(webSettings) {

            isWindowIncognito().then(function(isIncognito) {
                 isIncognitoFlag = isIncognito;
                 var dataToIframeGlobal;
                 var httpsFlag;
                 if (webSettings['webData']['domain_type'] == 'https') {
                     httpsFlag = true;
                 } else if (webSettings['webData']['domain_type'] == 'http') {
                     httpsFlag = false;
                     collectData().then(function(dataToIframe) {
                         
                         var subdomain = 'https://' + webSettings['webData']['subdomain'] + '.moengage.com';
                         var iframeToOpen = constructGet(subdomain, dataToIframe);

                         function callIframe() {
                             var iframe = document.createElement("iframe");
                             iframe.style.display = "none";
                             iframe.src = iframeToOpen;
                             document.getElementsByTagName('body')[0].appendChild(iframe);
                         };
                         callIframe();
                     })
                 };

                 var settingsData = {};
                 settingsData = webSettings['webData']['banner'];


                 function popupwindow(url, title, w, h) {
                     var left = (screen.width / 2) - (w / 2);
                     var top = (screen.height / 2) - (h / 2);
                     return window.open(url,'_blank'); // Opening in new tab
                 }

                 moeOpenSubDomain = function() {
                     // collectData().then(function(dataToIframe) {
                         var subdomain = 'https://' + webSettings['webData']['subdomain'] + '.moengage.com';
                         // dataToIframe.os_platform = 'Chrome' // Changing it from navigator to make proper JSON in subdomain
                         var iframeToOpen = constructGet(subdomain, dataToIframeGlobal);
                         popupwindow(iframeToOpen, 'mywindow', '600', '500');
                         localStorage.setItem("ask_web_push", false);
                         moeCloseBanner();
                     // });

                 };

                 moeLoadBanner = function() {
                     var iDiv = document.createElement('div');
                     iDiv.id = 'moe-push-div';
                     iDiv.className = 'moe-push-class';
                     // document.getElementsByTagName('body')[0].appendChild(iDiv);
                     // prependTo('body')
                     var bodyDiv = document.body.firstChild;
                     bodyDiv.parentNode.insertBefore(iDiv, bodyDiv);
                     if (httpsFlag == true) {
                         var textForSubscription = '<span onclick="moeSubscribeUserSwap()" style="top:5px;position:relative;">' + settingsData['opt_in_text'] + '</span>';
                     } else {
                         var textForSubscription = '<span onclick="moeOpenSubDomain()" style="top:5px;position:relative;">' + settingsData['opt_in_text'] + '</span>';
                     }
                     var textForCancelBanner = '<span onclick="moeRemoveBanner()" style="top:5px;position:relative;margin-left:5px;">' + settingsData['close_text'] + '</span>';
                     var finaTextForSubscription = textForSubscription + textForCancelBanner;
                     document.getElementById("moe-push-div").innerHTML = finaTextForSubscription;
                     var myElement = document.querySelector("#moe-push-div");
                     myElement.style.backgroundColor = settingsData['banner_bg_color'];
                     myElement.style.color = settingsData['banner_txt_color'];
                     myElement.style.height = "30px";
                     myElement.style.zIndex = "9999";
                     myElement.style.top = "0px";
                     myElement.style.width = "100%";
                     myElement.style.position = "relative";
                     myElement.style.textAlign = "center";
                     myElement.style.cursor = "pointer";
                     myElement.style.fontSize = "16px";
                     myElement.style.fontFamily = settingsData['banner_txt_font'] || "PT Sans";
                 };

                 moeRemoveBanner = function() {
                     var element = document.getElementById("moe-push-div");
                     element.parentNode.removeChild(element);
                     localStorage.setItem("ask_web_push", false);
                 };

                 moeCloseBanner = function() {
                     var element = document.getElementById("moe-push-div");
                     element.parentNode.removeChild(element);
                 };

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
                         collectData().then(function(dataToServiceWorker) {
                             dataToServiceWorker['push_id'] = subscriptionId;
                             navigator.serviceWorker.controller.postMessage({
                                 'data': dataToServiceWorker
                             });
                         })
                         return;
                     }
                     endpointSections = subscription.endpoint.split('/');
                     subscriptionId = endpointSections[endpointSections.length - 1];

                     collectData().then(function(dataToServiceWorker) {
                         dataToServiceWorker['push_id'] = subscriptionId;
                         navigator.serviceWorker.controller.postMessage({
                             'data': dataToServiceWorker
                         });
                     });
                     track_event("MOE_USER_SUBSCRIPTION_CHECK", {
                         'MOE_WEB_PUSH_TOKEN': subscriptionId
                     });

                     if (param == 'subscribed') {
                         track_event("MOE_USER_SUBSCRIBED", {
                             'MOE_WEB_PUSH_TOKEN': subscriptionId
                         });
                     } else if (param == undefined) {
                         track_event("MOE_USER_SUBSCRIPTION_CHECK", {
                             'MOE_WEB_PUSH_TOKEN': 'false'
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
                             var webPushPermission = localStorage.getItem("ask_web_push");
                             if (webPushPermission == undefined || webPushPermission == true && (bannerLoadFlag == true)) {
                                 moeCloseBanner();
                             }
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
                                     moeCloseBanner();
                                     // window.PushDemo.ui.setPushChecked(false);
                                     if (permissionState.state !== 'denied' &&
                                         permissionState.state !== 'prompt') {
                                         // If the permission wasnt denied or prompt, that means the
                                         // permission was accepted, so this must be an error
                                     }
                                 });
                         });
                 };

                 moeUnSubscribeUserSwap = function() {
                     console.log('Unsubscription Started');
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
                     // console.log('PushClient.setUpPushPermission()'); "Google Chrome"
                     if ('serviceWorker' in navigator && (sBrowser == "Google Chrome")) {
                         navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
                                 // Let's see if we have a subscription already
                                 return serviceWorkerRegistration.pushManager.getSubscription();
                             })
                             .then(function(subscription) {
                                 if (!subscription) {
                                     // NOOP since we have no subscription and the permission state
                                     // will inform whether to enable or disable the push UI
                                     subscriptionUpdate(null);
                                     var webPushPermission = localStorage.getItem("ask_web_push");
                                     if ((webPushPermission == undefined || webPushPermission == true) && (isIncognitoFlag == false) && (bannerLoadFlag == true)) {
                                         setTimeout(moeLoadBanner, bannerLoadTime);
                                     } else if ((webPushPermission == undefined || webPushPermission == true) && (isIncognitoFlag == false) && (bannerLoadFlag == false)) {
                                         // Need to remove it if user calls the below function themselves when not using banner
                                         var loadFuncTime = webSettings['webData']['load_time'] * 1000;
                                         setTimeout(moeSubscribeUserSwap, loadFuncTime);
                                     }
                                     return;
                                 }
                                 subscriptionUpdate(subscription);

                             })
                             .catch(function(err) {
                                 console.log('PushClient.setUpPushPermission() Error', err);
                             });
                     } else {
                         console.log('Push Notification not allowed');
                     }
                 };

                 if (webSettings['webData']['banner'] && webSettings['webData']['banner']['banner_flag']) {
                     var bannerLoadFlag = webSettings['webData']['banner']['banner_flag'];
                 } else {
                     var bannerLoadFlag = false;
                 }

                 if (webSettings['webData']['banner'] && webSettings['webData']['banner']['banner_time']) {
                     var bannerLoadTime = webSettings['webData']['banner']['banner_time'] * 1000 // Coverting to milliseconds.
                 } else {
                     var bannerLoadTime = 0;
                 }
                 var checkHTTPLoadBanner = localStorage.getItem("ask_web_push");
                 if (httpsFlag == true && (sBrowser == "Google Chrome") && (isIncognitoFlag == false)) {
                     registerServieWorker(); // Registering a service worker on load
                     moeCheckPushSubscriptionStatus();
                 } else if (httpsFlag == false && (sBrowser == "Google Chrome") && (isIncognitoFlag == false) && (checkHTTPLoadBanner == null || checkHTTPLoadBanner == undefined || checkHTTPLoadBanner == true) && (bannerLoadFlag == true)) {
                     collectData().then(function(dataToIframe) {
                        dataToIframeGlobal = dataToIframe;
                        setTimeout(moeLoadBanner, bannerLoadTime);
                      });
                 }

             });

         }
         /* Web Push Code End
          * Below is the return call of MOE function
          */

     return function(data) {
         self.moe_data = data
         if (!validateData())
             return
         return {
             track_event: track_event,
             add_user_attribute: add_user_attribute,
             add_first_name: add_first_name,
             add_last_name: add_last_name,
             add_email: add_email,
             add_mobile: add_mobile,
             add_user_name: add_user_name,
             add_gender: add_gender,
             add_birthday: add_birthday,
             // add_location: add_location,
             destroy_session: destroy_session,
             add_unique_user_id: add_unique_user_id,
             call_web_push: callWebPush
         }
     };

 }());

 // M_SDK = moe({ app_id: moe_app_id});