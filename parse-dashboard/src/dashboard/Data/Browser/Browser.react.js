
import CategoryList from 'components/CategoryList/CategoryList.react';
import React from 'react';
import Parse from 'parse';

import EmptyState from 'components/EmptyState/EmptyState.react';
import {List, Map} from 'immutable';
import Notification from 'dashboard/Data/Browser/Notification.react';
import DashboardView from 'dashboard/DashboardView.react';
import {ActionTypes } from 'lib/stores/SchemaStore';
import SidebarAction from 'components/Sidebar/SidebarAction';

import styles from 'dashboard/Data/Browser/Browser.scss';
import subscribeTo from 'lib/subscribeTo';



@subscribeTo('Schema', 'schema')
export default class Browser extends DashboardView {
  constructor() {
    super();

    this.section = 'Core';
    this.subsection = 'Browser';
    this.action = new SidebarAction('Create a class', this.showCreateClass.bind(this));

    this.state = {
      showCreateClassDialog: false,
      showAddColumnDialog: false,
      showRemoveColumnDialog: false,
      showDropClassDialog: false,
      showExportDialog: false,
      rowsToDelete: null,
      relation: null,
      counts: {},
      clp: {},

      filters: new List(),

      ordering: '-createdAt',
      selection: {},

      data: null,
      lastMax: -1,
      newObject: null,

      lastError: null,
      relationCount: 0,
    };

  }


  componentWillMount() {
    
    this.props.schema.dispatch(ActionTypes.FETCH)
      .then(() => this.handleFetchedSchema());
    


    if ( !this.props.params.className && this.props.schema.data.get('classes')) {
      this.redirectToFirstClass(this.props.schema.data.get('classes'));
    } else if (this.props.params.className)  {
      if ( this.props.location.query && this.props.location.query.filters) {
        let filters = new List();
        let queryFilters = JSON.parse(this.props.location.query.filters);
        queryFilters.forEach((filter) => {
          filters = filters.push(new Map(filter));
        });

        this.setState({filters}, () => {
          this.fetchData(this.props.params.className, this.state.filters);
        });
      } else {
        this.fetchData(this.props.params.className, this.state.filters);
      }

      this.setState({
        ordering: ColumnPreferences.getColumnSort(
          false,
          this.context.currenApp.applicationId,
          this.props.params.className
        )
      });
    }
  }


  componentWillReceiveProps(nextProps, nextContext) {
    if ( this.context !== nextContext) {
      let changes = {
        filters: new List(),
        data: null,
        newObject: null,
        lastMax: -1,
        ordering: ColumnPreferences.getColumnSort(
          false,
          nextContext.currenApp.applicationId,
          nextProps.params.className
        ),
        selection: {},
        relation: null
      };

      if(nextProps.location.query && nextProps.location.query.filters) {
        let queryFilters = JSON.parse(nextProps.location.query.filters);
        queryFilters.forEach((filter) => {
          changes.filters = changes.filters.push(new Map(filter));
        });
      }

      if ( this.props.params.appId !== nextProps.params.appId || !this.props.params.className) {
        changes.counts = {};
        Parse.Object._clearAllState();
      }

      this.setState(changes);

      if ( nextProps.params.className) {
        this.fetchData(nextProps.params.className, nextProps.location.query && nextProps.location.query.filters ? changes.filters : []);
      }

      nextProps.schema.dispatch(ActionTypes.FETCH)
        .then(() => this.handleFetchedSchema());
    }

    if ( !nextProps.params.className && nextProps.schema.data.get('classes')) {
      this.redirectToFirstClass(nextProps.schema.data.get('classes'));
    }
  }


  redirectToFirstClass(classList) {
    
    if ( !classList.isEmpty()) {
      let classes = Object.keys(classList.toObject());
      classes.sort((a, b) => {
        if ( a[0] === '_' && b[0] !== '_') {
          return -1;
        }
        if ( b[0] === '_' && a[0] !== '_') {
          return 1;
        }

        return a.toUpperCase() < b.toUpperCase() ? -1 : 1;
      });

      history.replace(this.context.generatePath('browser/' + classes[0]));
    }
  }

  showCreateClass() {
    if ( !this.props.schema.data.get('classes')) {
      return;
    }

    this.setState({showCreateClassDialog: true});
  }


  handleFetchedSchema() {
    this.props.schema.data.get('classes').forEach((_, className) => {
      
      this.context.currenApp.getClassesCount(className)
        .then(count => this.setState({counts: {[className]: count, ...this.state.counts}}));
    })

    this.setState({clp: this.props.schema.data.get('CLPs').toJS()});
  }


  renderSidebar() {
    let current = this.props.params.className || '';
    let classes = this.props.schema.data.get('classes');
    
    if ( !classes) {
      return null;
    }

    let special = [];
    let categories = [];
    classes.forEach((value, key) => {
      let count = this.state.counts[key];
      if ( count === undefined) {
        count = '';
      } else if (count >= 1000) {
        count = prettyNumber(count);
      }

      if ( SpecialClasses[key]) {
        special.push({name: SpecialClasses[key], id: key, count: count});
      } else {
        categories.push({ name: key, count: count});
      }
    });

    special.sort((a, b) => stringCompare(a.name, b.name));
    categories.sort((a, b) => stringCompare(a.name, b.name));

    return (
      <CategoryList
        current={current}
        linkPrefix={'browser/'}
        categories={special.concat(categories)} />
    );
  }




  renderContent() {
    let browser = null;
    let className = this.props.params.className;

    if ( this.state.relation) {
      className = this.state.relation.targetClassName;
    }
    let classes = this.props.schema.data.get('classes');

    if ( classes) {
      
      if ( classes.size === 0) {
        browser = (
          <div className={styles.empty}>
            <EmptyState
              title='You have no classes yet'
              description={'This is where you can view and edit your app\u2019s data'}
              icon='files-solid'
              cta='Create your first class'
              action={this.showCreateClass.bind(this)} />
          </div>
        );
      } else if (className && classes.get(className)) {
        let schema = {};
        classes.get(className).forEach(({type, targetClass}, col) => {
          schema[col] = {
            type,
            targetClass,
          };
        });

        let columns = {
          objectId: { type: 'String'}
        };

        let userPointers = [];
        classes.get(className).forEach((field, name) => {
          if ( name === 'objectId') {
            return;
          }

          let info = { type: field.type};
          if ( field.targetClass) {
            info.targetClass = field.targetClass;
            if ( field.targetClass === '_User') {
              userPointers.push(name);
            }
          }
          columns[name] = info;
        });

        
        browser = (
          <DataBrowser
            count={this.state.relation ? this.state.relationCount : this.state.counts[className]}
            perms={this.state.clp[className]}
            schema={schema}
            userPointers={userPointers}
            filters={this.state.filters}
            onFilterChange={this.updateFilters.bind(this)}
            onRemoveColumn={this.showRemoveColumn.bind(this)}
            onDeleteRows={this.showDeleteRows.bind(this)}
            onDropClass={this.showDropClass.bind(this)}
            onExport={this.showExport.bind(this)}
            onChangeCLP={clp => {
              let p = this.props.schema.dispatch(ActionTypes.SET_CLP, {
                className: this.props.params.className,
                clp,
              });
              p.then(() => this.handleFetchedSchema());
              return p;
            }}
            onRefresh={this.refresh.bind(this)}

            columns={columns}
            className={className}
            fetchNextPage={this.fetchNextPage.bind(this)}
            maxFetched={this.state.lastMax}
            selectRow={this.selectRow.bind(this)}
            selection={this.state.selection}
            data={this.state.data}
            ordering={this.state.ordering}
            newObject={this.state.newObject}
            relation={this.state.relation}
            disableKeyControls={this.hasExtras()}
            updateRow={this.updateRow.bind(this)}
            updateOrdering={this.updateOrdering.bind(this)}
            onPointerClick={this.handlePointerClick.bind(this)}
            setRelation={this.setRelation.bind(this)}
            onAddColumn={this.showAddColumn.bind(this)}
            onAddRow={this.addRow.bind(this)}
            onAddClass={this.showCreateClass.bind(this)} />
        );


      }
    }

    let extras = null;
    if ( this.state.showCreateClassDialog) {

    }

    return (
      <div>
        {browser}
        <Notification note={this.state.lastError} />
        {extras}
      </div>
    );
  }
}