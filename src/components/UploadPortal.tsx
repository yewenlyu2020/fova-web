import React from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Upload,
  Modal,
  Tooltip,
  Switch
} from 'antd';
import { FormInstance } from 'antd/lib/form';
import {
  InboxOutlined,
  ExclamationCircleOutlined,
  CloudUploadOutlined,
  QuestionCircleOutlined
} from "@ant-design/icons";

import 'styles/uploadPortal.css';

import UploadController from 'components/UploadController';

import * as APIUtils from 'utils/api-utils';

const { Option } = Select;
const { confirm } = Modal;

type PropsType = {
  language: 'en-us' | 'zh-hans';
}

type StateType = {
  fileData: File | null;
  uploadName: string;
  serviceType: string;
  uploadInProgress: boolean;
  unfinishedUpload: boolean;
  unfinishedUploadName: string;
  parallelUpload: boolean;
}

class UploadPortal extends React.Component<PropsType, StateType> {

  state: StateType;
  formItemLayout: any;
  formRef: React.RefObject<FormInstance<any>>;

  constructor(props: PropsType) {
    super(props);
    this.state = {
      fileData: null,
      uploadName: "",
      serviceType: "ev",
      uploadInProgress: false,
      unfinishedUpload: false,
      unfinishedUploadName: "",
      parallelUpload: false
    };

    this.formItemLayout = {
      labelCol: { span: 6 },
      wrapperCol: { span: 14 }
    };

    this.formRef = React.createRef<FormInstance>();
  }

  componentDidMount() {
    APIUtils.get('/api/data/upload/list', { product: "ev" })
      .then(response => {
        if (response.code === 'OK') {
          let uploadList: any[] = (response as APIUtils.SuccessResponseDataType).data.items;
          if (uploadList.length !== 0 && uploadList[0].state === 'uploading') {
            this.setState({
              unfinishedUpload: true,
              unfinishedUploadName: (uploadList[0].upload_name)
            });

            confirm({
              title: this.enzh(
                `Unfinished upload detected: ${this.state.unfinishedUploadName}`,
                `检测到尚未完成的上传: ${this.state.unfinishedUploadName}`
              ),
              icon: <ExclamationCircleOutlined />,
              content: this.enzh(
                "If you wish to resume the unfinished upload, select the same file and upload again. ",
                "如果您想要继续未完成的上传，请在您的设备上选择该文件并再次点击上传。"
              ),
              onOk: () => {
                this.formRef.current?.setFieldsValue({
                  uploadName: this.state.unfinishedUploadName
                });
              },
              onCancel: () => {
                this.setState({
                  unfinishedUpload: false
                });
              },
              okText: this.enzh("OK", "确定"),
              cancelText: this.enzh("Cancel", "取消"),
              width: 500
            });
          }
        } else {
          APIUtils.promptError(response.code, this.props.language)
        }
      })
  }

  componentDidUpdate(prevProps: PropsType, prevState: StateType) {
    if (prevState.uploadInProgress && !this.state.uploadInProgress) {
      this.formRef.current?.resetFields();
    }
  }

  /** Controller Functions */
  uploadControl = (on: boolean) => this.setState({ uploadInProgress: on });
  inputUploadName = (e: any) => this.setState({ uploadName: e.target.value });
  selectService = (value: string) => this.setState({ serviceType: value });
  resumeUploadControl = (on: boolean) => this.setState({ unfinishedUpload: on });
  setParallelUpload = (checked: boolean) => this.setState({ parallelUpload: checked });
  onSubmit = (values: any) => {
    this.setState({
      uploadName: values.uploadName,
      serviceType: values.service,
      uploadInProgress: true
    });
  };

  loadFile = (e: any) => {
    this.setState({
      fileData: e.file
    });

    if (Array.isArray(e)) {
      return e;
    }
    return e && e.fileList;
  };

  enzh = (english: string, chinese: string): string =>
    this.props.language === 'en-us' ? english : chinese;

  render() {
    return (
      <div className="UploadPortal">
        <Form
          ref={this.formRef}
          className="upload-portal-form"
          name="upload-portal-form"
          {...this.formItemLayout}
          onFinish={this.onSubmit}
        >
          <Form.Item
            label={this.enzh("Upload Name", "数据名")}
            name="uploadName"
            rules={[
              { required: true, message: this.enzh("An upload name is required to continue", "请输入数据名") }
            ]}
          >
            <Input onChange={this.inputUploadName} placeholder={this.enzh("Custom name for this dataset.", "请自定义数据名")} />
          </Form.Item>

          <Form.Item
            label={this.enzh("Select Service", "选择数据类型")}
            initialValue="ev"
            name="service"
          >
            <Select onChange={this.selectService}>
              <Option value="ev">{this.enzh("EV Operation", "电动汽车运行数据")}</Option>
              <Option value="ess">{this.enzh("ESS Operation", "储能系统分析平台")}</Option>
              <Option value="rd">{this.enzh("Cell Long-term Performance Testing", "电芯循环测试数据")}</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label={this.enzh("Upload File", "上传数据")}
            rules={[
              { required: true, message: this.enzh("Please upload dataset to continue. ", "请添加数据文件") }
            ]}
          >
            <Form.Item
              name="dragger"
              valuePropName="fileList"
              getValueFromEvent={this.loadFile}
              noStyle
            >
              <Upload.Dragger
                name="files"
                beforeUpload={(file, fileList) => false}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">
                  {this.enzh("Click or drag file to this area to upload", "点击或拖拽文件至此区域")}
                </p>
              </Upload.Dragger>
            </Form.Item>
          </Form.Item>

          <Form.Item
            name="parallel"
            label={
              <span>
                {this.enzh("Parallel Upload ", "多线程上传 ")}
                <Tooltip
                  placement="bottom"
                  title={this.enzh(`Parallel upload MAY increase your upload speed,
                    if you have enough bandwidth. \nHowever, a progress bar won't be displayed
                    if you choose this option.`,
                    `如果您的网速足够，勾选多线程上传将提升上传速度，但同时您将无法查看上传进度。`)}
                >
                  <QuestionCircleOutlined />
                </Tooltip>
              </span>
            }
            valuePropName="checked"
          >
            <Switch onChange={this.setParallelUpload} />
          </Form.Item>
          <Form.Item
            wrapperCol={{
              span: 12,
              offset: 6
            }}
          >
            <Button
              className="upload-portal-button"
              type="primary"
              htmlType="submit"
              icon={<CloudUploadOutlined />}
              disabled={
                this.state.fileData === null ? true : false
              }
              loading={
                this.state.uploadInProgress ? true : false
              }
            >
              {this.state.uploadInProgress ?
                this.enzh("Upload In Progress", "上传中") :
                this.enzh("Start Upload", "开始上传")
              }
            </Button>
          </Form.Item>
        </Form>

        { this.state.uploadInProgress ?
          <UploadController
            file={this.state.fileData as File}
            uploadName={this.state.uploadName}
            product={this.state.serviceType}
            uploadControl={this.uploadControl}
            resumeUpload={this.state.unfinishedUpload}
            parallelUpload={this.state.parallelUpload}
            language={this.props.language}
          /> : null
        }
      </div>
    );
  }
}

export default UploadPortal;
