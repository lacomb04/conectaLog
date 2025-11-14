import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
    return (
        <div className="home-container">
            <h1>Bem-vindo ao ConectaLog Suporte</h1>
            <p>Esta é a sua plataforma de suporte interno. Aqui você pode abrir chamados e acompanhar o status deles.</p>
            <div className="links">
                <Link to="/tickets" className="button">Ver Chamados</Link>
                <Link to="/new-ticket" className="button">Abrir Novo Chamado</Link>
            </div>
        </div>
    );
};

export default Home;