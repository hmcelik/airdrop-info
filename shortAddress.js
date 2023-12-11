module.exports = function shortenAddress(
  address,
  charsToShow = 8,
  breakChar = "..."
) {
  var visibleChars = charsToShow / 2;
  if (address.length > charsToShow) {
    return (
      address.substring(0, visibleChars) +
      breakChar +
      address.substring(address.length - visibleChars)
    );
  } else {
    return address;
  }
};
