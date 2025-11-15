/**
 * Get block explorer URL based on chain ID
 */
export function getExplorerUrl(chainId: number): string {
  switch (chainId) {
    case 5042002: // Arc Testnet
      return 'https://testnet.arcscan.app';
    case 42220: // Celo Mainnet
      return 'https://celoscan.io';
    case 11142220: // Celo Sepolia
      return 'https://celo-sepolia.blockscout.com';
    case 31337: // Hardhat
      return 'http://localhost:8545';
    default:
      return 'https://testnet.arcscan.app';
  }
}

/**
 * Get block explorer URL for an address
 */
export function getAddressExplorerUrl(address: string, chainId: number): string {
  const baseUrl = getExplorerUrl(chainId);
  return `${baseUrl}/address/${address}`;
}
