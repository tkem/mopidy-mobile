angular.module('app.settings', ['ionic', 'app.services'])

  .config(function($stateProvider) {
    $stateProvider.state('tabs.settings', {
      url: '/settings',
      views: {
        'settings': {
          templateUrl: 'templates/settings.html',
          controller: 'SettingsCtrl'
        }
      }
    });
  })

  .controller('SettingsCtrl', function($scope, $state, $log, $ionicHistory, $translate, Config, locales) {
    var link = angular.element(document.getElementById('theme'));

    $scope.locales = locales;
    $scope.settings = {
      locale: Config.get('language', 'en'),
      theme: Config.get('theme', 'ionic'),
      action: Config.get('action', 'add+play')
    };

    $log.log('locale', $scope.settings.locale);
    $log.log('theme', $scope.settings.theme, link.attr('href'));

    $scope.$watch('settings.locale', function(value) {
      $log.log('New locale: ' + value);
      Config.set('locale', value);
      $translate.use(value);
    });

    $scope.$watch('settings.theme', function(value) {
      $log.log('New theme: ' + value);
      Config.set('theme', value);
      link.attr('href', 'css/' + value + '.min.css');
      $state.go($state.current, {}, {reload: true});
    });

    $scope.$watch('settings.action', function(value) {
      $log.log('New action: ' + value);
      Config.set('action', value);
    });
  })
;
