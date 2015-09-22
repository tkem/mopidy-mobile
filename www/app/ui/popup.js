;(function(module) {
  'use strict';

  module.factory('popup', function($filter, $rootScope, $ionicPopup) {
    var translate = $filter('translate');  // filter is synchronous

    return {
      alert: function(message) {
        return $ionicPopup.alert({
          okText: translate('OK'),
          title: translate(message)
        });
      },
      confirm: function(message) {
        return $ionicPopup.confirm({
          title: translate(message),
          okText: translate('OK'),
          cancelText: translate('Cancel')
        });
      },
      prompt: function(text, placeholder) {
        return $ionicPopup.prompt({
          title: translate(text),
          inputPlaceholder: placeholder,
          okText: translate('OK'),
          cancelText: translate('Cancel')
        });
      },
      fromTemplateUrl: function(title, templateUrl, scope, buttons) {
        return $ionicPopup.show({
          title: translate(title),
          cssClass: 'mopidy-mobile-popup',
          templateUrl: templateUrl,
          scope: scope,
          buttons: (buttons || []).map(function(button) {
            return angular.extend({}, button, {text: translate(button.text)});
          }),
        });
      }
    };
  });

})(angular.module('app.ui.popup', ['ionic', 'pascalprecht.translate']));
