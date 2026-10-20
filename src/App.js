// Bootstrap CSS
import "bootstrap/dist/css/bootstrap.min.css";
// Bootstrap Bundle JS
import "bootstrap/dist/js/bootstrap.bundle.min";
// Bootstrap icons
import "bootstrap-icons/font/bootstrap-icons.css";

import './App.css';

import {BrowserRouter,Routes, Route} from 'react-router-dom';

import { Dashboard } from './pages/Dashboard';
import { Latihan } from './pages/Latihan';
import { Pengaturan } from './pages/Pengaturan';
import { DetailSesi } from './pages/DetailSesi';
import { NotFound } from './pages/NotFound';

import { LiveScoring } from './pages/LiveScoring';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />}></Route>
        <Route path="/latihan" element={<Latihan />}></Route>
        <Route path="/detail-sesi" element={<DetailSesi />}></Route>
        <Route path="/latihan/detail" element={<DetailSesi />}></Route>
        <Route path="/latihan/:id" element={<DetailSesi />}></Route>
        <Route path="/detail-sesi/:id" element={<DetailSesi />}></Route>
        <Route path="/live-scoring" element={<LiveScoring />}></Route>
        <Route path="/live-scoring/:id" element={<LiveScoring />}></Route>
        <Route path="/pengaturan" element={<Pengaturan />}></Route>
        <Route path="/notfound" element={<NotFound />}></Route>
        <Route path="/not-found" element={<NotFound />}></Route>
        <Route path="*" element={<NotFound />}></Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
