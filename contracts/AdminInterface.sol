import "./user/UserManager.sol";
import "./store/StoreManager.sol";

/**
  * Interface to global contracts
*/
contract AdminInterface {
  UserManager public userManager;
  StoreManager public storeManager;

  /**
    * Constructor. Initialize global contracts and pointers
  */
  function AdminInterface() {
    userManager = new UserManager();
    storeManager = new StoreManager();
  }
}
