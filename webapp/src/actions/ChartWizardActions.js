import Reflux from 'reflux'

let ChartWizardActions = Reflux.createActions([
  'initialize',
  'clear',
  'editTitle',
  'addLocation',
  'addFirstIndicator',
  'addIndicator',
  'removeIndicator',
  'addCampaign',
  'changeChart',
  'changeGroupRadio',
  'changeLocationLevelRadio',
  'changeTimeRadio',
  'changeYFormatRadio',
  'changeXFormatRadio',
  'changeYAxis',
  'changeZAxis',
  'changePalette',
  'setXYAxisLabel',
  'saveChart'
])

export default ChartWizardActions
