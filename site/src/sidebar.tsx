


import * as React from "react";
import * as ReactDOM from "react-dom";

import { Header, Menu, Icon, Button, Sidebar, Segment } from "semantic-ui-react";

export interface MainSidebarProps {
    visible?: boolean;
}

export interface MainSidebarState {
}

export class MainSidebar extends React.Component<MainSidebarProps, MainSidebarState> {

    constructor(props: MainSidebarProps) {
        super(props);
        this.state = {
        }
    }

    render() {
        const { visible } = this.props;
        return <div>
            <Sidebar.Pushable as={Segment}>
                <Sidebar as={Menu} animation='scale down' width='thin' visible={visible} icon='labeled' vertical inverted>
                    <Menu.Item name='home'>
                        <Icon name='home' />
                        Home
            </Menu.Item>
                    <Menu.Item name='gamepad'>
                        <Icon name='gamepad' />
                        Games
            </Menu.Item>
                    <Menu.Item name='camera'>
                        <Icon name='camera' />
                        Channels
            </Menu.Item>
                </Sidebar>
                <Sidebar.Pusher>
                    <Segment basic>
                        <Header as='h3'>Application Content</Header>
                    </Segment>
                </Sidebar.Pusher>
            </Sidebar.Pushable>
        </div>;
    }
}