contract ErrorCodes {
    function Success(ErrorCodesEnum result) internal returns (bool) {
        return result == ErrorCodesEnum.SUCCESS;
    }

    enum ErrorCodesEnum {
        NULL,
        SUCCESS,
        ERROR,
        NOT_FOUND,
        USERNAME_EXISTS,
        STOREITEM_EXISTS,
        INSUFFICIENT_BALANCE
    }
}
