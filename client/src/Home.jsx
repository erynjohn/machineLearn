import React, { Component } from 'react';
export default class Home extends Component {

  constructor(props) {
    super(props);
    this.state = {
      message: 'Loading...'
    }
  }

 onLogoutClick = (event) => {
  event.preventDefault();
  fetch('/api/logout', {
    method: 'POST',
    body: JSON.stringify(this.state),
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(res => {
    if (res.status === 200) {
      this.props.history.push('login');
    } else {
      const error = new Error(res.error);
      throw error;
    }
  })
  .catch(err => {
    console.error(err);
   
  });
}
  
  componentDidMount() {
    fetch('/api/home')
      .then(res => res.text())
      .then(res => this.setState({message: res}));
  }
  
  render() {
    return (

      <div>

      <button
              style={{
                width: "150px",
                borderRadius: "3px",
                letterSpacing: "1.5px",
                marginTop: "1rem"
              }}
              onClick={this.onLogoutClick}
              className="btn btn-large"
            >
              Logout
            </button>
      </div>

    );
  }
}