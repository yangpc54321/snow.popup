  var snow_scripts = {};

  snow_scripts.domain_global = function () {
    new SNC.DomainPickerGenerator().changeDomain('global');
    gs.log('!message=Domain switched to global. You can close this window.');
  };

  snow_scripts.domain_primary = function () {
    try {
      var gr_domain = new GlideRecord('domain');
      gr_domain.addEncodedQuery('^primary=true');
      gr_domain.queryNoDomain();
      if (gr_domain.next()) {
        new SNC.DomainPickerGenerator().changeDomain(gr_domain.getValue('sys_id'));
        gs.log('!message=Domain switched to ' + gr_domain.getValue('name') + '. You can close this window.');
      } else {
        gs.log('!message=Error. No primary domain!');
      }
    } catch (e) {
      gs.log('!message=Error switching domain. Domain separation not enabled?');
    }
  };

  snow_scripts.domain_user = function () {
    try {
      var gr_domain = new GlideRecord('domain');
      gr_domain.addQuery('sys_id', gs.getUser().getRecord().getValue('sys_domain'));
      gr_domain.queryNoDomain();
      if (gr_domain.next()) {
        new SNC.DomainPickerGenerator().changeDomain(gr_domain.getValue('sys_id'));
        gs.log('!message=Domain switched to ' + gr_domain.getValue('name') + '. You can close this window.');
      } else {
        gs.log('!message=Error. No primary domain!');
      }
    } catch (e) {
      gs.log('!message=Error switching domain. Domain separation not enabled?');
    }
  }

  snow_scripts.record_duplicate = function (params) {
    var gr = new GlideRecord(params.table);
    if (params.query) gr.addEncodedQuery(params.query);
    if (params.sys_id) gr.addEncodedQuery('sys_id=' + params.sys_id);
    gr.query();
    var sys_ids = [];
    while (gr.next()) {
      gr.insert();
      sys_ids.push(gr.getValue('sys_id'));
    }
    gs.log('!message=Records duplicated');
    gs.log('!url=' + params.table + '_list.do?sysparm_query=sys_idIN' + sys_ids.join(','));
  };

  snow_scripts.add_to_updset = function (params) {
    if (!params.tables) {
      params = {
        tables: [params]
      }
    }
    params.tables.forEach(function (v) {
      if (v.table.startsWith('sys_update_')) {
        gs.log('!message=Invalid table. This table cannot be recorded in update set.');
        return;
      }
      if (SNC.MetadataLinkUtil.isTableMetadataLinkExempt(v.table)) {
        gs.log('!message=ServiceNow prevents publishing records for the table because they can potentially cause a security risk when installed on other instances');
        return;
      }
      var table = new TableUtils(v.table);
      if (v.getTables().indexOf('sys_metadata') >= 0) {
        gs.log('!message=The table is already recorded in update set. Operation aborted.');
        return;
      }
      if (!v.sys_id && !v.query) {
        gs.log('!message=No qualification criteria.');
        return;
      }

      var gr = new GlideRecord(v.table);
      if (v.sys_id)
        gr.addQuery('sys_id', v.sys_id);
      if (v.query)
        gr.addEncodedQuery(v.query);
      gs.log("!message=Querying table " + v.table + " sysparm_query=" + gr.getEncodedQuery())
      gr.query();

      var um = new GlideUpdateManager2();
      while (gr.next()) {
        gs.log('!message=Registering current version of ' + v.table + " / " + gr.sys_id + " in update set...");
        um.saveRecord(gr);
      }
    });
  }