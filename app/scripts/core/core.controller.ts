module ngApp.core.controllers {
  import ICartService = ngApp.cart.services.ICartService;
  import INotifyService = ng.cgNotify.INotifyService;
  import IUserService = ngApp.components.user.services.IUserService;

  export interface ICoreController {
    showWarning: boolean;
    loading: boolean;
  }

  declare var bowser: any; //NOTE resolves TS error cannot find 'bowser'

  class CoreController implements ICoreController {
    showWarning: boolean = false;
    loading: boolean;
    loading5s: boolean;
    loading8s: boolean;
    loadingTimers: ng.IPromise<any>[];
    loweredBody: boolean;

    /* @ngInject */
    constructor(
      public $scope: ng.IScope,
      private $rootScope: ngApp.IRootScope,
      private CartService: ICartService,
      private notify: INotifyService,
      $location: ng.ILocationService,
      private $cookies: ng.cookies.ICookiesService,
      UserService: IUserService,
      private $uibModal: any,
      private $uibModalStack,
      private $timeout,
      private config: any
    ) {
      this.config = $rootScope.config;
      this.loweredBody = false;
      this.$rootScope.$on('hideBanner', () => this.loweredBody = false);

      this.loadingTimers = [];

      this.$rootScope.$on('$stateChangeStart', (event, toState, toParams, fromState, fromParams, options) => {
        UserService.login();
        this.$rootScope.$emit('ShowLoadingScreen');
      });

      this.$rootScope.$on("$stateChangeSuccess", (event, toState: any, toParams: any, fromState: any) => {
        this.$rootScope.$emit('ClearLoadingScreen');
        if (Object.keys(toState.data || {}).indexOf('tab') === -1) {
          document.body.scrollTop = 0;
          document.documentElement.scrollTop = 0;
        }
      });

      this.$rootScope.$on('ShowLoadingScreen', (data, throttleMs) => {
        this.loadingTimers.push(this.$timeout(() => this.showLoadingScreen(), throttleMs || 500));
      });

      this.$rootScope.$on('ClearLoadingScreen', () => {
        this.clearLoadingScreen();
      });

      // display login failed warning
      if((<any>_).get($location.search(), 'error') === 'You are not authorized to gdc services') {
        this.$timeout(() => {
          if (!this.$uibModalStack.getTop()) {
            var loginWarningModal = this.$uibModal.open({
              templateUrl: "core/templates/login-failed-warning.html",
              controller: "WarningController",
              controllerAs: "wc",
              backdrop: "static",
              keyboard: false,
              backdropClass: "warning-backdrop",
              animation: false,
              size: "lg",
              resolve: {
                warning: null,
                header: null
              }
            });
          }
        });
      }

      if (!$cookies.get("browser-checked")) {
        if (bowser.msie && bowser.version <= 9) { //NOTE: TS error Cannot find name 'bowser'
          this.$timeout(() => {
            if (!this.$uibModalStack.getTop()) {
              var bowserWarningModal = this.$uibModal.open({
                templateUrl: "core/templates/browser-check-warning.html",
                controller: "WarningController",
                controllerAs: "wc",
                backdrop: "static",
                keyboard: false,
                backdropClass: "warning-backdrop",
                animation: false,
                size: "lg",
                resolve: {
                  warning: 'The '+ this.config["site-wide"]["project-abbr"]+' Data Portal does not support the web browser you are using. This will prevent you from accessing certain features.',
                  header: null
                }
              });
              bowserWarningModal.result.then(() => {
                this.$cookies.put("browser-checked", "true");
              });
            };
          });
        } else {
          this.$cookies.put("browser-checked", "true");
        }
      }

      $scope.$on("undo", (event, action) => {
        if (action === "added") {
          CartService.undoAdded();
        } else if (action === "removed") {
          CartService.undoRemoved();
        }
        this.notify.closeAll();
      });

      this.$rootScope.undoClicked = (action: string): void => {
        this.$rootScope.$broadcast("undo", action);
      };

      this.$rootScope.cancelRequest = (): void => {
        this.$rootScope.$broadcast("gdc-cancel-request");
      };

      this.$rootScope['handleApplicationClick'] = (): void => {
        $scope.$broadcast('application:click');
      }
      this.$rootScope['closeWarning'] = () => {
        this.$rootScope['showWarning'] = false;
        this.$cookies.put("NCI-Warning", "true");
      };

    }

    showLoadingScreen() {
      this.loading = true;
      this.loadingTimers = this.loadingTimers.concat(
        this.$timeout(() => this.loading5s = true, 5000),
        this.$timeout(() => this.loading8s = true, 8000)
      );
    }

    clearLoadingScreen() {
      this.loading = false
      this.loading5s = false;
      this.loading8s = false;
      this.loadingTimers.forEach(x => this.$timeout.cancel(x));
    }
  }

  class WarningController {
    /* @ngInject */
    constructor(private $uibModalInstance, private warning, private header) {}

    acceptWarning(): void {
      this.$uibModalInstance.close();
    }
  }

  angular
      .module("core.controller", ["ngCookies", "user.services"])
      .controller("WarningController", WarningController)
      .controller("CoreController", CoreController);
}
