import "./homepage~stylesheet.css";

export default function Home() {
  return (
    <main>
      <header className = "header">
        <p>REPLACE LATER</p>
      </header>
      <div className = "logoContainer">
        <img className ="MainLogo" src="assets/logo-large.png"></img>
        <h1 className = "hook">Your Favorite Comfy Art Duo</h1>
    </div>
    <section className ="sectionsContainer" id="Commissions">
        <div className = "redirectSections">
            <div className = "mainSection">
                <h1>Commissions Redirect</h1>
            </div>
            <div className="sideSection">
                <h1>Have an Idea? <br></br>  We do Commisions</h1>
            </div> 
        </div>
    </section>
    <section className ="sectionsContainer" id="shop">
        <div className = "redirectSections">
            <div className="sideSection">
                <h1>Like our Style? <br></br> Shop Our Products</h1>
            </div> 
            <div className = "mainSection">
                <h1>Products Redirect</h1>
            </div>
            
        </div>
    </section>
    <section className ="sectionsContainer" id="AboutUs">
        <div className = "redirectSections">
            <div className="mainSection">
                <h1>About Us Redirect</h1>
            </div> 
            <div className = "mainSection">
                <h1>Porfolio Redirect</h1>
            </div>
            
        </div>
    </section>
    <footer className = "footer">
        <p>REPLACE LATER</p>
    </footer>
    </main>
  );
}
