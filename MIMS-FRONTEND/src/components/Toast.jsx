
import { MdClose } from 'react-icons/md';

const Toast = ({ message, onClose }) => (
  <div className="fixed top-6 right-6 z-50 bg-malawiRed text-malawiGold px-4 py-2 rounded shadow-lg flex items-center animate-fade-in">
    <span className="mr-4">{message}</span>
    <button onClick={onClose} className="bg-malawiGold text-malawiRed rounded-full p-1 ml-2 hover:bg-malawiBlack hover:text-malawiGold transition"><MdClose className="text-lg" /></button>
  </div>
);

export default Toast;
