import WalletAddressBox from '../components/WalletAddressBox';
import BalanceDisplay from '../components/BalanceDisplay';
import WalletActions from '../components/WalletActions';
import RecentActivity from '../components/RecentActivity';
import WalletSetup from '../components/WalletSetup';
import { useWalletStore } from '../store';

function HomePage() {
  const { hasWallet, walletAddress } = useWalletStore();

  // Show wallet setup if no wallet exists
  if (!hasWallet || !walletAddress) {
    return <WalletSetup />;
  }

  // Show normal wallet interface
  return (
    <>
      <WalletAddressBox />
      <BalanceDisplay />
      <WalletActions />
      <RecentActivity />
    </>
  );
}

export default HomePage;
