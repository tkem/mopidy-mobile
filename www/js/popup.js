angular.module('mopidy-mobile.popup', [
  'ionic',
  'pascalprecht.translate'
])

.factory('popup', function($filter, $ionicPopup) {
    var filter = $filter('translate');  // filter is synchronous

    return {
        error: function(error) {
            var options = {
                title: filter(error.name || 'Error'),
                okText: filter('OK'),
                cancelText: filter('Reload')  // misuse of confirm...
            };
            if (error.message) {
                options.subTitle = error.message;
            }
            if (error.data && error.data.message) {
                options.template = error.data.message;
            }
            $ionicPopup.confirm(options).then(function(ok) {
                if (!ok) {
                    // FIXME: connection.reset()
                    location.hash = '';
                    location.reload(true);
                }
            });
        }
    };
});
