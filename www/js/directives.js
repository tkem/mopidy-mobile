angular.module('app.directives', [])

.directive('mopidyItem', function($log) {
  var ITEM_TPL_CONTENT_ANCHOR =
    '<a class="item-content" ng-href="{{$href()}}" target="{{$target()}}"></a>';
  var ITEM_TPL_CONTENT =
    '<div class="item-content"></div>';
  return {
    require: 'ngModel',
    restrict: 'E',
    controller: ['$scope', '$element', function($scope, $element) {
      this.$scope = $scope;
      this.$element = $element;
    }],
    scope: true,
    compile: function($element, $attrs) {
      $log.debug('compile', $element, $attrs);
      var isAnchor = angular.isDefined($attrs.href) ||
        angular.isDefined($attrs.ngHref) ||
        angular.isDefined($attrs.uiSref);
      var isComplexItem = isAnchor ||
        //Lame way of testing, but we have to know at compile what to do with the element
        /ion-(delete|option|reorder)-button/i.test($element.html());
      if (isComplexItem) {
        var innerElement = angular.element(isAnchor ? ITEM_TPL_CONTENT_ANCHOR : ITEM_TPL_CONTENT);
        innerElement.append('<i class="icon {{$icon()}}"></i>');
        innerElement.append($element.contents());
        $element.append(innerElement);
        $element.addClass('item item-complex item-icon-left');
      } else {
        $element.addClass('item item-icon-left');
        $element.prepend('<i class="icon {{$icon()}}"></i>');
      }

      return function link($scope, $element, $attrs) {
        $scope.$icon = function() {
          var model = $scope.$parent[$attrs.ngModel];
          return 'mopidy-icon-' + model.type;
        };
        $scope.$href = function() {
          return $attrs.href || $attrs.ngHref;
        };
        $scope.$target = function() {
          return $attrs.target || '_self';
        };
      };
    }
  };
});
