import SendForm from '../components/SendForm';
import BackBtn from '../components/BackBtn';
import { useWalletStore } from '../store';

function SendPage({ requireUnlock }) {
  const { selectedNetwork } = useWalletStore();
  return (
    <>
      <div className="flex mb-2">
        <BackBtn />
        <h2 className="text-xl font-bold text-white mx-auto pr-7">Send {selectedNetwork.symbol}</h2>
      </div>
      <SendForm requireUnlock={requireUnlock} />
    </>
  );
}

export default SendPage;
