module ApplicationHelper
  def bootstrap_alert_class(flash_type)
    case flash_type.to_sym
    when :success then "success"
    when :error, :alert, :danger then "danger"
    when :notice then "info"
    when :warning then "warning"
    else flash_type.to_s
    end
  end
end
