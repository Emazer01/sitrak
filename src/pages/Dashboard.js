import * as React from "react";
import { Navbar } from "../component/Navbar";
import { Sidebar } from "../component/Sidebar";

export const Dashboard = () => {
  

  React.useEffect(() => {
    
  }, []);

  return (
    <div>
      <Navbar />
      <div className="d-flex">
        <Sidebar />
      </div>
    </div>
  );
};
