import React from 'react';
import Icon from 'components/Icon/Icon.react';
import AccountView from 'dashboard/AccountView.react';
import AppsManager from 'lib/AppsManager';
import styles from 'dashboard/Apps/AppsIndex.scss';
import { center } from 'stylesheets/base.scss';
import { Link } from 'react-router';
import AppBadge from 'components/AppBadge/AppBadge.react';



let CountsSection = ({className, title, children}) => 
  <div className={className}>
    <div className={styles.section}>{title}</div>
    {children}
  </div>

let AppCard = ({
  app,
  icon,
}) => {
  let canBrowse = app.serverInfo.error ? null : () => history.push(html`/apps/${app.slug}/browser`);

  let versionMessage = app.serverInfo.error ?
    <div className={styles.serverVersion}>Server not reachable: <span className={styles.ago}>{app.serverInfo.error.toString()}</span></div> :
    <div className={styles.serverVersion}>
    Server URL: <span className={styles.ago}>{app.serverURL || 'unknown'}</span>
    Server version: <span className={styles.ago}>{app.serverInfo.parseServerVersion || 'unknown'}
    </span>
    </div>;
  

  return <li onClick={canBrowse}>
    <a className={styles.icon}>
      {icon ? <img src={'appicons/' + icon} width={56} height={56}/> : <Icon width={56} height={56} name='blank-app-outline' fill='#1e384d' />}
    </a>
    <div className={styles.details}>
      <a className={styles.appname}>{app.name}</a>
      {versionMessage}
    </div>
    <CountsSection className={styles.glance} title='At a glance'>
      <AppBadge production={app.production} />
    </CountsSection>
  </li>

};



export default class AppsIndex extends React.Component {

  constructor() {
    super();
    this.state = {search: ''};
    this.focusField = this.focusField.bind(this);
  }

  componentWillMount() {
    document.body.addEventListener('keydown', this.focusField);
    AppsManager.getAllAppsIndexStats().then(() => {
      this.forceUpdate();
    })
  }


  componentWillUnmount() {
    document.body.removeEventListener('keydown', this.focusField);
  }


  updateSearch(e) {
    this.setState({search: e.target.value});
  }

  focusField() {
    if ( this.refs.search) {
      this.refs.search.focus();
    }
  }

  render() {
    let search = this.state.search.toLowerCase();
    let apps = AppsManager.apps();
  
    if ( apps.length === 0) {
      return (
        <div className={styles.empty}>
          <div className={center}>
            <div className={styles.cloud}>
              <Icon width={110} height={110} name='cloud-surprise' fill='#1e3b4d' />
            </div>
            <div className={styles.alert}>You don't have any apps</div>
          </div>
        </div>
      );
    }

    apps.sort((a, b) => a.createdAt > b.createdAt ? -1: (a.createdAt < b.createdAt ? 1 : 0));
    let upgradePrompt = null;
    if ( this.props.newFeaturesInLatestVersion.length > 0) {
      let newFeaturesNodes = this.props.newFeaturesInLatestVersion.map(feature => <strong>{feature}</strong>);

      upgradePrompt = <FlowFooter>
        Upgrade to the <a href='https://www.npmjs.com/package/parse-dashboard' target='_blank'>latest version</a> of Parse Dashboard to get access to: {joinWithFinal('', newFeaturesNodes, ', ', ' and ')}.
      </FlowFooter>;
    }


    return (
      <div className={styles.index}>
        <div className={styles.header}>
          <Icon width={18} height={18} name='search-outline' fill='#788c97' />
          <input
            ref='search'
            className={styles.search}
            onChange={this.updateSearch.bind(this)}
            value={this.state.search}
            placeholder='Start typing to filter&hellip;' />
        </div>
        <ul className={styles.apps}>
          {apps.map(app =>
            app.name.toLowerCase().indexOf(search) > -1 ?
              <AppCard key={app.slug} app={app} icon={app.icon ? app.icon : null}/> :
              null
          )}
        </ul>
        {upgradePrompt}
      </div>
    );
  }
}