import { useEffect, useState } from "react";
import './style.css';
import { ethers } from 'ethers';

// ✅ Replace with your deployed contract address
const contractAddress = "0x378eD97cebED5D7a265510D11063b313C271EC0d";

// ✅ ABI should exactly match your deployed contract
const contractABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [{ "internalType": "string", "name": "name", "type": "string" }],
    "name": "addCandidate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_proposalId", "type": "uint256" }],
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getWinner",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "proposalCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "proposal",
    "outputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "uint256", "name": "voteCount", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "hasVote",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
];

function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [winner, setWinner] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [newCandidate, setNewCandidate] = useState("");

  // 🔌 Connect to wallet and validate network
  const connectWallet = async () => {
  if (!window.ethereum) return alert("Please install MetaMask.");
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();

    if (network.chainId !== 11155111) { // Sepolia Chain ID
      alert("Please switch to the Sepolia Test Network in MetaMask.");
      return;
    }

    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    setAccount(address);

    const contractInstance = new ethers.Contract(contractAddress, contractABI, signer);
    setContract(contractInstance);

    console.log("✅ Connected to Sepolia & contract loaded");

  } catch (err) {
    console.error("Connection error:", err);
  }
};


  const fetchCandidates = async () => {
    try {
      const count = await contract.proposalCount();
      const list = [];
      for (let i = 0; i < Number(count); i++) {
        const data = await contract.proposal(i);
        list.push({ name: data.name, votes: Number(data.voteCount) });
      }
      setCandidates(list);
    } catch (err) {
      console.error("fetchCandidates failed:", err);
    }
  };

  const checkVoted = async () => {
    try {
      const voted = await contract.hasVote(account);
      setHasVoted(voted);
    } catch (err) {
      console.error("checkVoted error:", err);
    }
  };

  const checkOwner = async () => {
    try {
      const ownerAddr = await contract.owner();
      setIsOwner(ownerAddr.toLowerCase() === account.toLowerCase());
    } catch (err) {
      console.error("checkOwner error:", err);
      setIsOwner(false);
    }
  };

  const vote = async (index) => {
    try {
      const tx = await contract.vote(index);
      await tx.wait();
      setHasVoted(true);
      fetchCandidates();
    } catch (err) {
      alert("Voting failed: " + (err.reason || err.message));
    }
  };

  const getWinner = async () => {
    try {
      const result = await contract.getWinner();
      setWinner(result);
    } catch (err) {
      alert("Only the contract owner can call this");
    }
  };

  const addCandidate = async () => {
    if (!newCandidate.trim()) return;
    try {
      const tx = await contract.addCandidate(newCandidate.trim());
      await tx.wait();
      setNewCandidate("");
      fetchCandidates();
      alert("Candidate added!");
    } catch (err) {
      alert("Add failed: " + (err.reason || err.message));
    }
  };

  useEffect(() => {
    if (contract && account) {
      fetchCandidates();
      checkVoted();
      checkOwner();
      getWinner();
    }
  }, [contract, account]);

  return (
    <div className="app-wrapper">
      <h1 className="main-heading">Voting App</h1>
      <h2 className="sub-heading">Drop your votes here</h2>

      <button onClick={connectWallet} className="connect-btn">
        {account ? `Connected: ${account.slice(0, 6)}...` : "Connect Wallet"}
      </button>

      <p className="owner-status" style={{ color: isOwner ? 'limegreen' : 'crimson' }}>
        {account
          ? isOwner
            ? '✅ You ARE the owner'
            : '❌ You are NOT the owner'
          : '💡 Wallet not connected'}
      </p>

      {isOwner && (
        <div className="add-candidate-form">
          <input
            type="text"
            placeholder="Candidate name"
            value={newCandidate}
            onChange={(e) => setNewCandidate(e.target.value)}
          />
          <button onClick={addCandidate}>Add Candidate</button>
        </div>
      )}

      {candidates.map((c, i) => (
        <div key={i} className="candidate-card">
          <h2>{c.name}</h2>
          <p>🗳️ {c.votes} votes</p>
          <button onClick={() => vote(i)} disabled={hasVoted}>
            {hasVoted ? "Already Voted" : "Vote"}
          </button>
        </div>
      ))}

      <div style={{ marginTop: "20px" }}>
        <button onClick={getWinner}>Show Winner</button>
        {winner && <p>👑 Winner: {winner}</p>}
      </div>

      <div className="signature">Arcturus</div>
    </div>
  );
}

export default App;
