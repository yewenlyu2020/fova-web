import React from 'react';
import moment from 'moment';
import {
  Button,
  Table,
  Menu,
  DatePicker,
  Tag,
  Tooltip,
  Progress,
  Dropdown,
  Popover,
  Input
} from 'antd';
import {
  CloudUploadOutlined,
  FilterOutlined,
  ReloadOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';

import { UploadStateType } from 'components/Dashboard';
import AlgorithmController from 'components/AlgorithmController';

import * as APIUtils from 'utils/api-utils';

const { RangePicker } = DatePicker;
const { Search } = Input;

type PropsType = {
  tab: string;
  uploadDrawerControl: (on: boolean) => void;
  uploadState: UploadStateType;
  uploadModal: boolean;
  uploadModalControl: (on: boolean) => void;
  language: 'en-us' | 'zh-hans';
}

type StateType = {
  fileList: any[];
  pageCount: number;
  pagination: number;
  keyWord: string;
  timeRange: TimeRangeType;
  refresh: boolean;
  algorithmModal: boolean;
}

type TimeRangeType = [moment.Moment, moment.Moment];

class UploadTable extends React.Component<PropsType, StateType> {

  targetFileId: string;
  pageSize: number;

  constructor(props: PropsType) {
    super(props);
    this.state = {
      fileList: [],
      pageCount: 1,
      pagination: 1,
      keyWord: "",
      timeRange: [moment.unix(0), moment.unix(0)],
      refresh: false,
      algorithmModal: false
    }

    this.targetFileId = "";
    this.pageSize = 7;
  }

  resetState = () => {
    this.setState({
      pagination: 1,
      keyWord: "",
      timeRange: [moment.unix(0), moment.unix(0)]
    });
  }

  getFileList = () => {
    let requestParams: APIUtils.ParamsType = {
      product: APIUtils.ProductsInfo[this.props.tab].productName,
      page_num: this.state.pagination,
      page_size: this.pageSize
    }

    if (this.state.keyWord !== "") {
      requestParams['search'] = this.state.keyWord;
    }

    if (this.state.timeRange[1].unix() !== 0) {
      requestParams['begin_time'] = this.state.timeRange[0].unix();
      requestParams['end_time'] = this.state.timeRange[1].unix();
    }

    APIUtils.get('/api/data/upload/list', requestParams)
      .then(response => {
        if (response.code === 'OK') {
          // assign a unique key for each row of the table
          let uploadList: any[] = (response as APIUtils.SuccessResponseDataType).data.items;
          uploadList.forEach((uploadItem: any) => {
            uploadItem['key'] = uploadItem.id;
          });

          this.setState({
            fileList: uploadList,
            pageCount: (response as APIUtils.SuccessResponseDataType).data['total_page']
          });
        } else {
          APIUtils.promptError(response.code, this.props.language);
        }
      });
  }

  resetForm = () => {
    this.resetState();
    this.getFileList();
  }

  componentDidMount() {
    this.getFileList();
  }

  componentDidUpdate(prevProps: PropsType, prevState: StateType) {
    if (
      this.props.tab !== prevProps.tab ||
      this.state.refresh !== prevState.refresh
    ) {
      this.resetForm();
    }

    if (this.props.uploadModal !== prevProps.uploadModal && this.props.uploadModal) {
      this.resetForm();
    }

    if (this.state.algorithmModal !== prevState.algorithmModal) {
      this.getFileList();
    }
  }

  /** Controller Functions */
  algorithmControl = (on: boolean) => this.setState({ algorithmModal: on });
  timeRangeControl = (value: any) => this.setState({ timeRange: value });
  targetFileIdReset = () => this.targetFileId = "";

  handlePaginationChange = (value: number) => {
    this.setState({
      pagination: value
    });
    this.getFileList();
  }

  handleSelectAlgorithm = (e: any, fileName: string) => {
    e.preventDefault();
    let selectedFile = this.state.fileList.find(file => file.file_name === fileName);
    this.targetFileId = selectedFile.id;
    this.setState({
      algorithmModal: true
    });
  }

  handleSearch = (value: string) => {
    this.setState({
      keyWord: value
    });

    this.getFileList();
  }

  enzh = (english: string, chinese: string): string =>
    this.props.language === 'en-us' ? english : chinese;

  render() {

    let bulkActionMenu = (
      <Menu>
        <Menu.Item key="bulk-choose-algo">{this.enzh("Choose Algorithm", "选择算法")}</Menu.Item>
        <Menu.Item key="bulk-view-result">{this.enzh("View Result", "查看结果")}</Menu.Item>
      </Menu>
    );

    let filterPopup = (
      <div>
        <RangePicker
          showTime={{ format: 'HH:mm' }}
          format="YYYY-MM-DD HH:mm"
          ranges={{
            'Today': [moment(), moment()],
            'This Month': [moment().startOf('month'), moment()],
            'This Year': [moment().startOf('year'), moment()]
          }}
          allowClear={true}
          disabledDate={(current: moment.Moment) => current > moment().endOf('day')}
          onChange={this.timeRangeControl}
          onOk={this.getFileList}
        />
      </div>
    );

    let fileTableColumns = [
      {
        title: this.enzh('File Name', '数据名'),
        dataIndex: 'upload_name',
        key: 'file_name',
      },
      {
        title: this.enzh('File Key', '数据编码'),
        dataIndex: 'id',
        key: 'id',
      },
      {
        title: this.enzh('Upload Time', '上传时间'),
        dataIndex: 'created_at',
        key: 'created_at',
        width: 400,
        render: (text: number) => {
          let current = new Date(text * 1000);
          return <div>{current.toString().split(' ').splice(0, 6).join(' ')}</div>
        }
      },
      {
        title: this.enzh('Status', '状态'),
        dataIndex: 'state',
        key: 'state',
        width: 275,
        render: (text: string, record: any) => {
          switch (text) {
            case 'uploaded-raw':
              return (
                <Tag color="cyan">
                  {this.enzh("Uploaded", "上传完成")}
                </Tag>
              );
            case 'init':
            case 'uploading':
              if (this.props.uploadState.inProgress && record.upload_name === this.props.uploadState.fileName) {
                return (
                  <Tooltip title={
                    this.enzh("View upload status", "查看详情")
                  }>
                    <div className="table-progress" onClick={() => this.props.uploadModalControl(true)}>
                      <Progress
                        percent={this.props.uploadState.progress}
                        showInfo={!(this.props.uploadState.step === 1 && this.props.uploadState.progress === 100)}
                        strokeColor={this.props.uploadState.step === 1 && this.props.uploadState.progress === 100 ? "#90ee90" : undefined}
                        size="small"
                        status={this.props.uploadState.error ? "exception" :
                          (this.props.uploadState.step === 2 && this.props.uploadState.progress === 100 ? "success" : "active")}
                      />
                    </div>
                  </Tooltip>
                );
              } else {
                return (
                  <Tooltip title={
                    this.enzh(
                      "To continue an unfinished upload, upload it again",
                      "如果您想要继续未完成的上传，请再次上传该文件"
                    )
                  }>
                    <Tag color="orange">
                      {this.enzh("Upload Cancelled", "上传未完成")}
                    </Tag>
                  </Tooltip>
                );
              }
            default:
              return (
                <Tag color="blue">
                  {this.enzh("Complete", "分析完成")}
                </Tag>
              );
          }
        },
      },
      {
        title: this.enzh('Action', '可选操作'),
        dataIndex: '',
        key: 'x',
        render: (text: any, record: any) => {
          if (record.state === 'uploaded-raw') {
            return (<a href="/#" onClick={e => { this.handleSelectAlgorithm(e, record.file_name) }}>{this.enzh("Select Algorithm", "选择算法")}</a>);
          } else if (record.state === 'uploading' || record.state === 'init') {
            return (<span style={{ color: "#00000040" }}>-</span>);
          } else {
            return (<a href="/#" onClick={e => { e.preventDefault() }}>{this.enzh("View Result", "查看结果")}</a>);
          }
        },
      },
    ];

    return (
      <div className="UploadTable">
        <Button
          className="table-button"
          type="primary"
          shape="round"
          icon={<CloudUploadOutlined />}
          onClick={() => this.props.uploadDrawerControl(true)}
        >
          {
            this.state.fileList[0]?.state !== 'uploading' && !this.props.uploadState.inProgress ?
              this.enzh("New Upload", "上传数据") :
              this.enzh("Resume / New Upload", "新建/继续上传")
          }
        </Button>

        <Dropdown overlay={bulkActionMenu} trigger={['click']}>
          <Button
            className="table-button"
            shape="round"
            icon={<UnorderedListOutlined />}
          >
            {this.enzh("Bulk Action", "多选操作")}
          </Button>
        </Dropdown>

        <Popover
          placement="bottomLeft"
          content={filterPopup}
          trigger="click"
        >
          <Button
            className="table-button"
            shape="round"
            icon={<FilterOutlined />}
          >
            {this.enzh("Filter", "筛选")}
          </Button>
        </Popover>

        <Search
          key={this.state.refresh.toString()}
          onSearch={this.handleSearch}
          size="small"
          style={{
            width: 200,
            padding: "5px",
          }}
        />

        <Button
          className="table-button refresh"
          shape="round"
          type="link"
          icon={<ReloadOutlined />}
          onClick={this.resetForm}
        >
          {this.enzh("Refresh / Clear Filter", "重置")}
        </Button>

        <Table
          size="middle"
          rowSelection={{}}
          pagination={{
            total: this.state.pageCount,
            pageSize: this.pageSize,
            current: this.state.pagination,
            onChange: this.handlePaginationChange
          }}
          columns={fileTableColumns}
          dataSource={this.state.fileList}
        />
        {
          this.state.algorithmModal ?
            <AlgorithmController
              fileId={this.targetFileId}
              algorithmControl={this.algorithmControl}
              language={this.props.language}
            /> : null
        }
      </div>
    );
  }
}

export default UploadTable;