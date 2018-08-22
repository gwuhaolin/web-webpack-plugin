import { Component } from 'react';
import * as React from 'react';
import { render } from 'react-dom';
import { Button } from '../../components/Button';
import './index.css';

class PageHome extends Component {
	render() {
		return (
			<div>
				PageHome
				<Button />
			</div>
		);
	}
}

render(<PageHome />, document.getElementById('app'));
