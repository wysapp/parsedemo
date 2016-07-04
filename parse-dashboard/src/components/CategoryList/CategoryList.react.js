import PropTypes from 'lib/PropTypes';
import React from 'react';
import ReactDOM from 'react-dom';
import styles from 'components/CategoryList/CategoryList.scss';

import { Link } from 'react-router';


export default class CategoryList extends React.Component {


  render() {

    console.log('CategoryList.react.js', this.props.categories);
    if ( this.props.categories.length === 0 ) {
      return null;
    }
  }
}