import logo from './logo.svg';
import './App.css';

// Bootstrap CSS
import "bootstrap/dist/css/bootstrap.min.css";
// Bootstrap Bundle JS
import "bootstrap/dist/js/bootstrap.bundle.min";
// Bootstrap icons
import "bootstrap-icons/font/bootstrap-icons.css";

import {BrowserRouter,Routes, Route} from 'react-router-dom';

import { Dashboard } from './pages/Dashboard';
import { Latihan } from './pages/Latihan';
import { Pengaturan } from './pages/Pengaturan';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />}></Route>
        <Route path="/latihan" element={<Latihan />}></Route>
        <Route path="/pengaturan" element={<Pengaturan />}></Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
