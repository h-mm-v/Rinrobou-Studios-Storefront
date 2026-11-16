import "../admin-panel.css"

export default function CommissionsPage(){
    return <div className="AnalyticsPanel">
            <div className="AnalyticsGraphPanel">
                Graph of Daily Traffic
                <div className="AnalyticsGraph">
                    Graph Goes Here
                </div>
            </div>
            <div className="AnalysticsCustomerVisibility">
                Customer Visibility
                <div className="AnalyticsCustomerLog">
                    Customer ID: 1234; Last Login, 13:50PST
                </div>
            </div>
        </div>;
}