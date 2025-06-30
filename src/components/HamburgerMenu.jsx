import { Menu, MenuItems, MenuItem, MenuButton } from '@headlessui/react';
import { Menu as MenuIcon, Copy, HelpCircle, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore, useUIStore } from '../store';
import { copyToClipboard } from '../util';

function HamburgerMenu() {
  const { principal } = useAuthStore();
  const { setHelpModalOpen } = useUIStore();

  const handleCopyPrincipal = async () => {
    const result = await copyToClipboard(principal, 'Principal ID');
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleHelpClick = () => {
    setHelpModalOpen(true);
  };

  const handleExplorer = () => {
    window.open('https://gorbscan.com/#explorer/', '_blank');
  };

  const handleSupport = () => {
    window.open('https://discord.gg/', '_blank');
  };

  return (
    <Menu as="div" className="relative flex items-center justify-center inline-block text-left">
      <MenuButton className="bg-zinc-600 border border-zinc-500 text-zinc-300 cursor-pointer p-1.5 rounded-md flex items-center justify-center transition-all duration-200 hover:bg-zinc-500 hover:text-white">
        <MenuIcon size={16} />
      </MenuButton>
      <MenuItems anchor="bottom end" className="absolute right-0 mt-2 w-44 bg-neutral-800 rounded-md border border-zinc-600 shadow-[0_10px_25px_rgba(0,0,0,0.3)] z-50 overflow-hidden outline-none">
        <div className="p-1">
          <MenuItem>
            {({ active }) => (
              <button
                onClick={handleCopyPrincipal}
                className="w-full text-left bg-transparent border-none text-white py-3 px-4 text-sm transition-all duration-200 flex items-center gap-2 rounded m-0.5 hover:bg-zinc-600 hover:text-white"
              >
                <Copy size={16} />
                Copy Principal ID
              </button>
            )}
          </MenuItem>
          <MenuItem>
            {({ active }) => (
              <button
                onClick={handleHelpClick}
                className="w-full text-left bg-transparent border-none text-white py-3 px-4 text-sm transition-all duration-200 flex items-center gap-2 rounded m-0.5 hover:bg-zinc-600 hover:text-white"
              >
                <HelpCircle size={16} />
                About
              </button>
            )}
          </MenuItem>
          <MenuItem>
            {({ active }) => (
              <button
                onClick={handleSupport}
                className="w-full text-left bg-transparent border-none text-white py-3 px-4 text-sm transition-all duration-200 flex items-center gap-2 rounded m-0.5 hover:bg-zinc-600 hover:text-white"
              >
                <ExternalLink size={16} />
                Support
              </button>
            )}
          </MenuItem>
          <MenuItem>
            {({ active }) => (
              <button
                onClick={handleExplorer}
                className="w-full text-left bg-transparent border-none text-white py-3 px-4 text-sm transition-all duration-200 flex items-center gap-2 rounded m-0.5 hover:bg-zinc-600 hover:text-white"
              >
                <ExternalLink size={16} />
                Explorer
              </button>
            )}
          </MenuItem>
        </div>
      </MenuItems>
    </Menu>
  );
}

export default HamburgerMenu;
